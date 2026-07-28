// bookingLinkRepository 회귀 테스트 — 임시 DB에 실제 시드 + 직접 삽입한 회차로 검증한다
import { execSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

process.env.CINEFIT_DB_PATH = join(mkdtempSync(join(tmpdir(), 'cinefit-bookinglink-')), 'bookinglink-test.db');
process.env.CINEFIT_CLOCK_MODE = 'demo';

import { bookingLinkRepository } from '../../src/data/bookingLinkRepository';
import { getAppDbClient } from '../../src/data/client/index';

let showtimeId: number;

beforeAll(async () => {
  const env = { ...process.env };
  execSync('node spikes/minimal-db/seed.mjs', { env });
  execSync('node db/migrate.mjs', { env });
  execSync('node db/seed-seat-zones.mjs', { env });
  execSync('node db/seed-aliases.mjs', { env });

  const db = getAppDbClient();
  const [movie] = await db.query<{ id: number }>(`SELECT id FROM movies LIMIT 1`);
  const [auditorium] = await db.query<{ id: number }>(`SELECT id FROM auditoriums LIMIT 1`);
  const rows = await db.query<{ id: number }>(
    `INSERT INTO showtimes
       (movie_id, auditorium_id, starts_at, ends_at_est, format, price_adult, booking_url,
        entry_method, data_checked_at, info_status, status, is_synthetic)
     VALUES (?,?,?,?,?,?,?,'manual',?,'official','active',0) RETURNING id`,
    [
      movie.id,
      auditorium.id,
      '2026-07-29T19:00:00+09:00',
      '2026-07-29T21:30:00+09:00',
      'standard',
      15000,
      'https://ticket.cgv.co.kr/test-show',
      '2026-07-28T00:00:00+09:00',
    ],
  );
  showtimeId = rows[0].id;
});

describe('예매 링크 검증 대상 조회', () => {
  it('활성·비합성·예매URL 있는 회차만 검증 대상이다', async () => {
    const targets = await bookingLinkRepository.listCheckableShowtimes();
    expect(targets.some((t) => t.showtimeId === showtimeId)).toBe(true);
    expect(targets.every((t) => t.bookingUrl)).toBe(true);
  });
});

describe('검증 기록', () => {
  it('기록이 없으면 최신 상태는 null이다', async () => {
    const rows = await bookingLinkRepository.listLatestChecks();
    const row = rows.find((r) => r.showtimeId === showtimeId)!;
    expect(row.status).toBeNull();
    expect(row.checkedAt).toBeNull();
  });

  it('여러 번 기록해도 가장 최근 것만 반환한다', async () => {
    await bookingLinkRepository.recordCheck({
      showtimeId,
      status: 'blocked',
      httpStatus: 403,
      note: null,
      checkedAt: '2026-07-28T01:00:00Z',
    });
    await bookingLinkRepository.recordCheck({
      showtimeId,
      status: 'valid',
      httpStatus: 200,
      note: null,
      checkedAt: '2026-07-28T02:00:00Z',
    });
    const rows = await bookingLinkRepository.listLatestChecks();
    const row = rows.find((r) => r.showtimeId === showtimeId)!;
    expect(row.status).toBe('valid');
    expect(row.httpStatus).toBe(200);
    expect(row.checkedAt).toBe('2026-07-28T02:00:00Z');
  });
});
