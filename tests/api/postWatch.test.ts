// 관람후 만족도 API 회귀 테스트 — 임시 DB에 직접 시드 (라이브 DB 파일 복사 금지)
import { execSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

process.env.CINEFIT_DB_PATH = join(mkdtempSync(join(tmpdir(), 'cinefit-postwatch-')), 'postwatch-test.db');
process.env.CINEFIT_CLOCK_MODE = 'demo'; // now = 2026-07-27T12:00+09:00

import { getAppDbClient } from '../../src/data/client/index';
import { POST as postPostWatch } from '../../app/api/recommendations/[runId]/post-watch/route';

function submit(runId: number, body: unknown) {
  return postPostWatch(
    new Request(`http://localhost/api/recommendations/${runId}/post-watch`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ runId: String(runId) }) },
  );
}

let futureRunId: number;
let pastRunId: number;

beforeAll(async () => {
  const env = { ...process.env };
  execSync('node spikes/minimal-db/seed.mjs', { env });
  execSync('node db/migrate.mjs', { env });
  execSync('node db/seed-seat-zones.mjs', { env });
  execSync('node db/seed-aliases.mjs', { env });

  const db = getAppDbClient();
  // 데모 시계 기준(2026-07-27T12:00+09:00)으로 미래/과거 회차를 각각 하나씩 만든다
  const futureShowtime = await db.query<{ id: number }>(
    `INSERT INTO showtimes (movie_id, auditorium_id, starts_at, ends_at_est, format, price_adult, data_checked_at, info_status, status, is_synthetic)
     VALUES (1,1,?,?,'imax',20000,?, 'estimated','active',1) RETURNING id`,
    ['2026-08-01T19:00:00+09:00', '2026-08-01T21:30:00+09:00', '2026-07-27T00:00:00.000Z'],
  );
  const pastShowtime = await db.query<{ id: number }>(
    `INSERT INTO showtimes (movie_id, auditorium_id, starts_at, ends_at_est, format, price_adult, data_checked_at, info_status, status, is_synthetic)
     VALUES (1,1,?,?,'imax',20000,?, 'estimated','active',1) RETURNING id`,
    ['2026-07-20T19:00:00+09:00', '2026-07-20T21:30:00+09:00', '2026-07-27T00:00:00.000Z'],
  );

  const makeRun = async (showtimeId: number) =>
    (
      await db.query<{ id: number }>(
        `INSERT INTO recommendation_runs (user_id, request, weights, results, latency_ms, policy_version, code_version, created_at)
         VALUES ('demo-user', ?, '{}', ?, 5, 'v1', '0.2.0', ?) RETURNING id`,
        [JSON.stringify({ movieId: 1 }), JSON.stringify([{ showtimeId }]), new Date().toISOString()],
      )
    )[0].id;

  futureRunId = await makeRun(futureShowtime[0].id);
  pastRunId = await makeRun(pastShowtime[0].id);
});

describe('관람후 만족도', () => {
  it('존재하지 않는 추천 실행 id는 404', async () => {
    const res = await submit(999_999, { overallSatisfaction: 5 });
    expect(res.status).toBe(404);
  });

  it('필수 항목(전체 만족도) 없으면 400', async () => {
    const res = await submit(pastRunId, { infoAccuracy: 4 });
    expect(res.status).toBe(400);
  });

  it('범위를 벗어난 점수(0, 6)는 400', async () => {
    const res = await submit(pastRunId, { overallSatisfaction: 6 });
    expect(res.status).toBe(400);
  });

  it('상영 시작 전 회차만 있는 실행은 422 — 관람 전 평가 저장 금지', async () => {
    const res = await submit(futureRunId, { overallSatisfaction: 5 });
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error).toContain('상영 시간');
  });

  it('이미 시작한 회차의 실행은 정상 저장된다', async () => {
    const res = await submit(pastRunId, {
      overallSatisfaction: 5,
      seatSatisfaction: 4,
      wouldReuseCinefit: 5,
    });
    expect(res.status).toBe(201);
    const rows = await getAppDbClient().query<{ overall_satisfaction: number; seat_satisfaction: number | null }>(
      `SELECT overall_satisfaction, seat_satisfaction FROM post_watch_surveys ORDER BY id DESC LIMIT 1`,
    );
    expect(rows[0].overall_satisfaction).toBe(5);
    expect(rows[0].seat_satisfaction).toBe(4);
  });
});
