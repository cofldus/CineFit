// 세션 하나에 딸린 데이터를 지우는 로직 — 개인정보 삭제 요청(privacyRequestService)과 보존
// 정책 정리(retentionService)가 공유한다. 자식 테이블 → recommendation_runs 링크 해제 →
// analytics_sessions 행 순서를 항상 지킨다 — PostgreSQL은 FK를 실제로 강제하므로 순서를
// 어기면 실패한다(SQLite는 기본적으로 FK를 강제하지 않지만 동일한 순서를 유지해 두 방언에서
// 같은 동작을 보장한다).
import { SESSION_REQUEST_DELETE_TABLES } from '../domain/retention/policy';
import type { DbClient } from './client/types';

export interface SessionDeletionCounts {
  analyticsEvents: number;
  recommendationFeedback: number;
  recommendationSelections: number;
  postWatchSurveys: number;
  alphaSurveys: number;
  inviteCodeRedemptions: number;
  alphaConsents: number;
  recommendationRunsUnlinked: number;
  analyticsSessionsDeleted: number;
}

const TABLE_TO_COUNT_KEY: Record<(typeof SESSION_REQUEST_DELETE_TABLES)[number], keyof SessionDeletionCounts> = {
  analytics_events: 'analyticsEvents',
  recommendation_feedback: 'recommendationFeedback',
  recommendation_selections: 'recommendationSelections',
  post_watch_surveys: 'postWatchSurveys',
  alpha_surveys: 'alphaSurveys',
  invite_code_redemptions: 'inviteCodeRedemptions',
  alpha_consents: 'alphaConsents',
};

/** 세션 하나에 딸린 모든 데이터를 지운다(analytics_sessions 행 자체까지). 반드시 트랜잭션 안에서 호출한다. */
export async function deleteSessionData(tx: DbClient, sessionId: string): Promise<SessionDeletionCounts> {
  const counts = {} as SessionDeletionCounts;
  for (const table of SESSION_REQUEST_DELETE_TABLES) {
    const result = await tx.run(`DELETE FROM ${table} WHERE session_id = ?`, [sessionId]);
    counts[TABLE_TO_COUNT_KEY[table]] = result.changes;
  }
  counts.recommendationRunsUnlinked = (
    await tx.run(`UPDATE recommendation_runs SET session_id = NULL WHERE session_id = ?`, [sessionId])
  ).changes;
  counts.analyticsSessionsDeleted = (
    await tx.run(`DELETE FROM analytics_sessions WHERE id = ?`, [sessionId])
  ).changes;
  return counts;
}

export interface SessionDataPreview {
  analyticsEvents: number;
  recommendationFeedback: number;
  recommendationSelections: number;
  postWatchSurveys: number;
  alphaSurveys: number;
  inviteCodeRedemptions: number;
  alphaConsents: number;
  recommendationRunsLinked: number;
  analyticsSessionExists: boolean;
}

/** 실제로 지우지 않고 영향받을 행 수만 센다(관리자 검토 화면용 미리보기). */
export async function previewSessionData(db: DbClient, sessionId: string): Promise<SessionDataPreview> {
  const count = async (table: string): Promise<number> => {
    const rows = await db.query<{ n: number }>(`SELECT COUNT(*) AS n FROM ${table} WHERE session_id = ?`, [sessionId]);
    return Number(rows[0]?.n ?? 0);
  };
  const [
    analyticsEvents,
    recommendationFeedback,
    recommendationSelections,
    postWatchSurveys,
    alphaSurveys,
    inviteCodeRedemptions,
    alphaConsents,
    recommendationRunsLinked,
    sessionRows,
  ] = await Promise.all([
    count('analytics_events'),
    count('recommendation_feedback'),
    count('recommendation_selections'),
    count('post_watch_surveys'),
    count('alpha_surveys'),
    count('invite_code_redemptions'),
    count('alpha_consents'),
    count('recommendation_runs'),
    db.query<{ id: string }>(`SELECT id FROM analytics_sessions WHERE id = ?`, [sessionId]),
  ]);
  return {
    analyticsEvents,
    recommendationFeedback,
    recommendationSelections,
    postWatchSurveys,
    alphaSurveys,
    inviteCodeRedemptions,
    alphaConsents,
    recommendationRunsLinked,
    analyticsSessionExists: sessionRows.length > 0,
  };
}
