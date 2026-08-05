// R21.1 §1 — 마이그레이션 적용 상태 조회. 서버리스(Vercel) 번들에서 db/migrations
// 디렉터리를 읽을 수 없으므로 기대 목록을 코드 상수로 둔다 — 실제 디렉터리와의 일치는
// tests/unit/migrationStatus.test.ts가 강제한다(목록 갱신을 잊으면 테스트가 깨진다).
import type { DbClient } from './client/types';

export const EXPECTED_MIGRATIONS: Record<'sqlite' | 'postgres', string[]> = {
  sqlite: [
    '001_sync_and_admin.sql',
    '002_seat_zones.sql',
    '003_fact_reports.sql',
    '004_alpha_analytics.sql',
    '005_identifier_linkage.sql',
    '006_private_alpha.sql',
    '007_privacy_requests.sql',
    '008_movie_poster.sql',
    '009_r21_showtime_ops_trace.sql',
  ],
  postgres: [
    '000_base.sql',
    '003_fact_reports.sql',
    '004_alpha_analytics.sql',
    '005_identifier_linkage.sql',
    '006_private_alpha.sql',
    '007_privacy_requests.sql',
    '008_movie_poster.sql',
    '009_r21_showtime_ops_trace.sql',
  ],
};

export interface MigrationStatus {
  ok: boolean;
  appliedCount: number;
  latestApplied: string | null;
  /** 기대 목록에 있으나 적용되지 않은 마이그레이션 — 있으면 health가 degraded */
  pending: string[];
}

export async function getMigrationStatus(db: DbClient, provider: 'sqlite' | 'postgres'): Promise<MigrationStatus> {
  const expected = EXPECTED_MIGRATIONS[provider];
  try {
    const rows = await db.query<{ name: string }>(`SELECT name FROM schema_migrations ORDER BY name`);
    const applied = new Set(rows.map((r) => r.name));
    const pending = expected.filter((m) => !applied.has(m));
    return {
      ok: pending.length === 0,
      appliedCount: rows.length,
      latestApplied: rows.length > 0 ? rows[rows.length - 1].name : null,
      pending,
    };
  } catch {
    // schema_migrations 자체가 없다 = 마이그레이션이 한 번도 돌지 않은 DB.
    return { ok: false, appliedCount: 0, latestApplied: null, pending: [...expected] };
  }
}
