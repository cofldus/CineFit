// 서버 측 분석 기록 — DB에 직접 쓴다. 지금은 "제공자"가 자체 DB뿐이지만, 나중에 외부
// 분석 도구를 붙이더라도 호출부(app/api/analytics/events/route.ts 등)는 이 함수만 알면 된다.
import { getAppDbClient } from '../data/client/index';
import type { DbClient } from '../data/client/types';
import { createFeatureFlagRepository } from '../data/featureFlagRepository';
import { hasAlphaConsent } from '../data/inviteCodeService';
import type { AnalyticsEventName } from './analyticsEvents';

export function createServerAnalytics(getDb: () => DbClient) {
  const featureFlags = createFeatureFlagRepository(getDb);

  async function ensureSession(sessionId: string, appVersion: string | undefined, nowIso: string): Promise<void> {
    const db = getDb();
    const existing = await db.query<{ id: string }>(`SELECT id FROM analytics_sessions WHERE id = ?`, [sessionId]);
    if (existing.length) {
      await db.run(`UPDATE analytics_sessions SET last_seen_at = ?, app_version = COALESCE(?, app_version) WHERE id = ?`, [
        nowIso,
        appVersion ?? null,
        sessionId,
      ]);
    } else {
      await db.run(
        `INSERT INTO analytics_sessions (id, first_seen_at, last_seen_at, app_version) VALUES (?,?,?,?)`,
        [sessionId, nowIso, nowIso, appVersion ?? null],
      );
    }
  }

  return {
    ensureSession,

    async recordEvent(
      eventName: AnalyticsEventName,
      properties: Record<string, unknown>,
      ctx: { sessionId: string; appVersion?: string; now: Date },
    ): Promise<void> {
      // private_alpha_gate가 꺼져 있으면(기본값) 7차 마일스톤과 동일하게 항상 기록한다.
      // 켜져 있으면 명시적으로 알파 참여에 동의한 세션만 기록한다(docs/PRIVATE-ALPHA.md).
      const db = getDb();
      if (await featureFlags.isEnabled('private_alpha_gate')) {
        if (!(await hasAlphaConsent(ctx.sessionId, db))) return;
      }
      const nowIso = ctx.now.toISOString();
      await ensureSession(ctx.sessionId, ctx.appVersion, nowIso);
      await db.run(
        `INSERT INTO analytics_events (session_id, event_name, properties, created_at) VALUES (?,?,?,?)`,
        [ctx.sessionId, eventName, JSON.stringify(properties), nowIso],
      );
    },
  };
}

export const serverAnalytics = createServerAnalytics(getAppDbClient);
