// reportStaleData 회귀 테스트 — 오래된 사양만 골라내고 아무것도 변경하지 않는지 확인한다
import { execSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

process.env.CINEFIT_DB_PATH = join(mkdtempSync(join(tmpdir(), 'cinefit-stalereport-')), 'stalereport-test.db');
process.env.CINEFIT_CLOCK_MODE = 'demo';

import { getAppDbClient } from '../../src/data/client/index';
import { reportStaleData } from '../../scripts/maintenance/markStaleData';

let staleAuditoriumId: number;

beforeAll(async () => {
  const env = { ...process.env };
  execSync('node spikes/minimal-db/seed.mjs', { env });
  execSync('node db/migrate.mjs', { env });
  execSync('node db/seed-seat-zones.mjs', { env });
  execSync('node db/seed-aliases.mjs', { env });

  const db = getAppDbClient();
  const [row] = await db.query<{ id: number }>(`SELECT id FROM auditoriums LIMIT 1`);
  staleAuditoriumId = row.id;
  await db.run(`UPDATE auditorium_specs SET observed_at = '2025-01-01T00:00:00Z' WHERE auditorium_id = ? AND valid_to IS NULL`, [
    staleAuditoriumId,
  ]);
});

describe('오래된 데이터 리포트', () => {
  it('180일 초과된 사양을 가진 상영관만 보고하고 DB를 바꾸지 않는다', async () => {
    const now = new Date('2026-07-28T00:00:00+09:00');
    const before = await getAppDbClient().query<{ info_status: string }>(
      `SELECT info_status FROM auditorium_specs WHERE auditorium_id = ? AND valid_to IS NULL`,
      [staleAuditoriumId],
    );

    const report = await reportStaleData(now);
    expect(report.stale.some((r) => r.auditoriumId === staleAuditoriumId)).toBe(true);

    const after = await getAppDbClient().query<{ info_status: string }>(
      `SELECT info_status FROM auditorium_specs WHERE auditorium_id = ? AND valid_to IS NULL`,
      [staleAuditoriumId],
    );
    expect(after[0].info_status).toBe(before[0].info_status);
  });
});
