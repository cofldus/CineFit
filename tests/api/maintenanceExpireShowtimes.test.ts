// expireShowtimes 회귀 테스트 — 임시 DB, 상영 종료 회차만 비활성화되는지 확인한다
import { execSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

process.env.CINEFIT_DB_PATH = join(mkdtempSync(join(tmpdir(), 'cinefit-expire-')), 'expire-test.db');
process.env.CINEFIT_CLOCK_MODE = 'demo';

import { getAppDbClient } from '../../src/data/client/index';
import { expireShowtimes } from '../../scripts/maintenance/expireShowtimes';

let pastShowtimeId: number;
let futureShowtimeId: number;

beforeAll(async () => {
  const env = { ...process.env };
  execSync('node spikes/minimal-db/seed.mjs', { env });
  execSync('node db/migrate.mjs', { env });
  execSync('node db/seed-seat-zones.mjs', { env });
  execSync('node db/seed-aliases.mjs', { env });

  const db = getAppDbClient();
  const [movie] = await db.query<{ id: number }>(`SELECT id FROM movies LIMIT 1`);
  const [auditorium] = await db.query<{ id: number }>(`SELECT id FROM auditoriums LIMIT 1`);

  const insertShowtime = async (startsAt: string, endsAt: string) =>
    (
      await db.query<{ id: number }>(
        `INSERT INTO showtimes
           (movie_id, auditorium_id, starts_at, ends_at_est, format, price_adult,
            entry_method, data_checked_at, info_status, status, is_synthetic)
         VALUES (?,?,?,?,'standard',15000,'manual',?,'official','active',0) RETURNING id`,
        [movie.id, auditorium.id, startsAt, endsAt, startsAt],
      )
    )[0].id;

  pastShowtimeId = await insertShowtime('2026-01-01T19:00:00+09:00', '2026-01-01T21:30:00+09:00');
  futureShowtimeId = await insertShowtime('2026-12-01T19:00:00+09:00', '2026-12-01T21:30:00+09:00');
});

describe('상영 종료 회차 자동 비활성화', () => {
  it('종료된 회차만 disabled로 바뀌고 이력이 남는다', async () => {
    const now = new Date('2026-07-28T00:00:00+09:00');
    const result = await expireShowtimes(now);
    expect(result.showtimeIds).toContain(pastShowtimeId);
    expect(result.showtimeIds).not.toContain(futureShowtimeId);

    const db = getAppDbClient();
    const [past] = await db.query<{ status: string }>(`SELECT status FROM showtimes WHERE id = ?`, [pastShowtimeId]);
    const [future] = await db.query<{ status: string }>(`SELECT status FROM showtimes WHERE id = ?`, [futureShowtimeId]);
    expect(past.status).toBe('disabled');
    expect(future.status).toBe('active');

    const changes = await db.query<{ action: string }>(
      `SELECT action FROM showtime_changes WHERE showtime_id = ? ORDER BY id DESC LIMIT 1`,
      [pastShowtimeId],
    );
    expect(changes[0].action).toBe('disable');
  });

  it('다시 실행해도 이미 비활성화된 회차는 중복 처리되지 않는다', async () => {
    const now = new Date('2026-07-28T00:00:00+09:00');
    const result = await expireShowtimes(now);
    expect(result.expiredCount).toBe(0);
  });
});
