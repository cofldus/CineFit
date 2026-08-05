// 알파 운영 대시보드용 사용 퍼널 정의 — 순수 상수·계산만 담아 DB 접근이 없다
// (src/data/alphaOpsRepository.ts가 이 이벤트 이름으로 실제 SQL을 만든다).
import type { AnalyticsEventName } from '../../analytics/analyticsEvents';

export interface FunnelStageDef {
  key: AnalyticsEventName;
  label: string;
}

/** 첫 단계(app_opened)에 도달한 고유 세션을 100%로 두고 이후 단계 도달률을 본다.
 * R21: 설문 단계별 이탈을 보기 위해 step1~3 이벤트를 퍼널에 편입했다. */
export const FUNNEL_STAGES: FunnelStageDef[] = [
  { key: 'app_opened', label: '앱 열림' },
  { key: 'movie_selected', label: '영화 선택' },
  { key: 'recommend_step1_started', label: '설문 1단계 진입' },
  { key: 'recommend_step1_completed', label: '1단계 완료' },
  { key: 'recommend_step2_completed', label: '2단계 완료' },
  { key: 'recommend_step3_completed', label: '3단계 완료(제출)' },
  { key: 'recommendation_generated', label: '추천 생성' },
  { key: 'feedback_submitted', label: '피드백 제출' },
];

export interface FunnelStageResult {
  key: AnalyticsEventName;
  label: string;
  sessionCount: number;
  /** 첫 단계 대비 도달률(%), 소수점 첫째 자리. 첫 단계가 0이면 0. */
  percentOfFirst: number;
}

/** 단계별 고유 세션 수(순서는 FUNNEL_STAGES와 동일하게 이미 맞춰져 있다고 가정)로 백분율을 계산한다. */
export function computeFunnelPercentages(counts: { key: AnalyticsEventName; label: string; sessionCount: number }[]): FunnelStageResult[] {
  const first = counts[0]?.sessionCount ?? 0;
  return counts.map((c) => ({
    ...c,
    percentOfFirst: first > 0 ? Math.round((c.sessionCount / first) * 1000) / 10 : 0,
  }));
}
