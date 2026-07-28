// 기능 플래그 — 관리자만 변경할 수 있고, 변경 이력은 audit_logs에 남는다(제보 승격과 동일 패턴).
// audit_logs.target_id는 INTEGER라 문자열 키를 넣을 수 없으므로 0(플래그 전용 고정값)을 쓰고
// 실제 키는 detail JSON에 담는다.
import { getAppDbClient } from './client/index';
import type { DbClient } from './client/types';

const AUDIT_TARGET_TYPE = 'feature_flag';
const AUDIT_TARGET_ID_SENTINEL = 0;

export interface FeatureFlagRow {
  key: string;
  enabled: boolean;
  description: string | null;
  updatedAt: string;
  updatedBy: string | null;
}

export interface SetFeatureFlagInput {
  key: string;
  enabled: boolean;
  description?: string | null;
  actor: string;
  now: Date;
}

function toRow(r: { key: string; enabled: number; description: string | null; updated_at: string; updated_by: string | null }): FeatureFlagRow {
  return {
    key: r.key,
    enabled: Boolean(r.enabled),
    description: r.description,
    updatedAt: r.updated_at,
    updatedBy: r.updated_by,
  };
}

export function createFeatureFlagRepository(getDb: () => DbClient) {
  async function get(key: string): Promise<FeatureFlagRow | null> {
    const rows = await getDb().query<{ key: string; enabled: number; description: string | null; updated_at: string; updated_by: string | null }>(
      `SELECT key, enabled, description, updated_at, updated_by FROM feature_flags WHERE key = ?`,
      [key],
    );
    return rows[0] ? toRow(rows[0]) : null;
  }

  return {
    async list(): Promise<FeatureFlagRow[]> {
      const rows = await getDb().query<{ key: string; enabled: number; description: string | null; updated_at: string; updated_by: string | null }>(
        `SELECT key, enabled, description, updated_at, updated_by FROM feature_flags ORDER BY key`,
      );
      return rows.map(toRow);
    },

    get,

    /** 플래그가 없으면 기본 off — 안전한 기본값(명시적으로 켜야만 노출). */
    async isEnabled(key: string): Promise<boolean> {
      const row = await get(key);
      return row?.enabled ?? false;
    },

    async set(input: SetFeatureFlagInput): Promise<FeatureFlagRow> {
      const db = getDb();
      return db.transaction(async (tx) => {
        const before = await tx.query<{ enabled: number }>(`SELECT enabled FROM feature_flags WHERE key = ?`, [input.key]);
        const nowIso = input.now.toISOString();
        await tx.run(
          `INSERT INTO feature_flags (key, enabled, description, updated_at, updated_by)
           VALUES (?,?,?,?,?)
           ON CONFLICT(key) DO UPDATE SET enabled = excluded.enabled, description = excluded.description,
             updated_at = excluded.updated_at, updated_by = excluded.updated_by`,
          [input.key, input.enabled ? 1 : 0, input.description ?? null, nowIso, input.actor],
        );
        await tx.run(
          `INSERT INTO audit_logs (actor, action, target_type, target_id, detail, created_at) VALUES (?,?,?,?,?,?)`,
          [
            input.actor,
            'feature_flag_set',
            AUDIT_TARGET_TYPE,
            AUDIT_TARGET_ID_SENTINEL,
            JSON.stringify({
              key: input.key,
              previousEnabled: before[0] ? Boolean(before[0].enabled) : null,
              newEnabled: input.enabled,
              description: input.description ?? null,
            }),
            nowIso,
          ],
        );
        const rows = await tx.query<{ key: string; enabled: number; description: string | null; updated_at: string; updated_by: string | null }>(
          `SELECT key, enabled, description, updated_at, updated_by FROM feature_flags WHERE key = ?`,
          [input.key],
        );
        return toRow(rows[0]);
      });
    },
  };
}

export const featureFlagRepository = createFeatureFlagRepository(getAppDbClient);
