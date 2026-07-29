// 보존 기간 정책 실제 적용 — scripts/retention-preview.ts·scripts/retention-apply.ts가 이 서비스를 쓴다.
// preview()는 아무것도 지우지 않고 개수만 센다. apply()는 실제로 지우고 audit_logs에 한 건 남긴다.
import { AGE_PURGE_RULES, ORPHAN_SESSION_AFTER_DAYS } from '../domain/retention/policy';
import { getAppDbClient } from './client/index';
import type { DbClient } from './client/types';

export type RetentionCounts = Record<string, number>;

function cutoffIso(now: Date, days: number): string {
  return new Date(now.getTime() - days * 86_400_000).toISOString();
}

/** last_seen_at이 오래됐고 세션 관련 테이블 어디에도 더 이상 참조가 없는 세션 id 목록. */
async function findOrphanSessionCandidates(db: DbClient, now: Date): Promise<string[]> {
  const cutoff = cutoffIso(now, ORPHAN_SESSION_AFTER_DAYS);
  const rows = await db.query<{ id: string }>(
    `SELECT id FROM analytics_sessions s
     WHERE s.last_seen_at < ?
       AND NOT EXISTS (SELECT 1 FROM analytics_events e WHERE e.session_id = s.id)
       AND NOT EXISTS (SELECT 1 FROM recommendation_feedback f WHERE f.session_id = s.id)
       AND NOT EXISTS (SELECT 1 FROM recommendation_selections sel WHERE sel.session_id = s.id)
       AND NOT EXISTS (SELECT 1 FROM post_watch_surveys p WHERE p.session_id = s.id)
       AND NOT EXISTS (SELECT 1 FROM alpha_surveys a WHERE a.session_id = s.id)
       AND NOT EXISTS (SELECT 1 FROM invite_code_redemptions r WHERE r.session_id = s.id)
       AND NOT EXISTS (SELECT 1 FROM alpha_consents c WHERE c.session_id = s.id)`,
    [cutoff],
  );
  return rows.map((r) => r.id);
}

export function createRetentionService(getDb: () => DbClient) {
  async function preview(now: Date): Promise<RetentionCounts> {
    const db = getDb();
    const counts: RetentionCounts = {};
    for (const rule of AGE_PURGE_RULES) {
      const rows = await db.query<{ n: number }>(
        `SELECT COUNT(*) AS n FROM ${rule.table} WHERE ${rule.dateColumn} < ?`,
        [cutoffIso(now, rule.days)],
      );
      counts[rule.table] = Number(rows[0]?.n ?? 0);
    }
    counts.analytics_sessions = (await findOrphanSessionCandidates(db, now)).length;
    return counts;
  }

  async function apply(now: Date, actor: string): Promise<RetentionCounts> {
    const db = getDb();
    return db.transaction(async (tx) => {
      const counts: RetentionCounts = {};
      for (const rule of AGE_PURGE_RULES) {
        const result = await tx.run(`DELETE FROM ${rule.table} WHERE ${rule.dateColumn} < ?`, [cutoffIso(now, rule.days)]);
        counts[rule.table] = result.changes;
      }

      const orphanSessions = await findOrphanSessionCandidates(tx, now);
      for (const sessionId of orphanSessions) {
        await tx.run(`UPDATE recommendation_runs SET session_id = NULL WHERE session_id = ?`, [sessionId]);
        await tx.run(`DELETE FROM analytics_sessions WHERE id = ?`, [sessionId]);
      }
      counts.analytics_sessions = orphanSessions.length;

      await tx.run(
        `INSERT INTO audit_logs (actor, action, target_type, target_id, detail, created_at) VALUES (?,?,?,?,?,?)`,
        [actor, 'retention_apply', 'retention_policy', 0, JSON.stringify(counts), now.toISOString()],
      );
      return counts;
    });
  }

  return { preview, apply };
}

export const retentionService = createRetentionService(getAppDbClient);
