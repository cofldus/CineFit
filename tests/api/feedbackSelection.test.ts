// 추천 피드백·실제 선택 기록 API 회귀 테스트 — 임시 DB에 직접 시드 (라이브 DB 파일 복사 금지)
import { execSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

process.env.CINEFIT_DB_PATH = join(mkdtempSync(join(tmpdir(), 'cinefit-feedback-')), 'feedback-test.db');
process.env.CINEFIT_CLOCK_MODE = 'demo';

import { getAppDbClient } from '../../src/data/client/index';
import { POST as postFeedback } from '../../app/api/recommendations/[runId]/feedback/route';
import { POST as postSelection } from '../../app/api/recommendations/[runId]/selection/route';

function feedback(runId: number, body: unknown, cookie?: string) {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (cookie) headers.cookie = cookie;
  return postFeedback(
    new Request(`http://localhost/api/recommendations/${runId}/feedback`, { method: 'POST', headers, body: JSON.stringify(body) }),
    { params: Promise.resolve({ runId: String(runId) }) },
  );
}

function selection(runId: number, body: unknown, cookie?: string) {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (cookie) headers.cookie = cookie;
  return postSelection(
    new Request(`http://localhost/api/recommendations/${runId}/selection`, { method: 'POST', headers, body: JSON.stringify(body) }),
    { params: Promise.resolve({ runId: String(runId) }) },
  );
}

let runId: number;

beforeAll(async () => {
  const env = { ...process.env };
  execSync('node spikes/minimal-db/seed.mjs', { env });
  execSync('node db/migrate.mjs', { env });
  execSync('node db/seed-seat-zones.mjs', { env });
  execSync('node db/seed-aliases.mjs', { env });

  const rows = await getAppDbClient().query<{ id: number }>(
    `INSERT INTO recommendation_runs (user_id, request, weights, results, latency_ms, policy_version, code_version, created_at)
     VALUES ('demo-user','{}','{}','[]',10,'v1','0.2.0',?) RETURNING id`,
    [new Date().toISOString()],
  );
  runId = rows[0].id;
});

describe('추천 피드백', () => {
  it('알 수 없는 추천 실행 id는 404', async () => {
    const res = await feedback(999_999, { helpfulness: 'very_helpful' });
    expect(res.status).toBe(404);
  });

  it('helpfulness가 없으면 400', async () => {
    const res = await feedback(runId, { reasons: ['other'] });
    expect(res.status).toBe(400);
  });

  it('정상 제출 — 201 + 세션 쿠키 발급 + DB 저장', async () => {
    const res = await feedback(runId, { showtimeId: 1, helpfulness: 'very_helpful', reasons: ['reason_understood', 'other'] });
    expect(res.status).toBe(201);
    expect(res.headers.get('set-cookie')).toContain('cinefit_session=');

    const rows = await getAppDbClient().query<{ helpfulness: string; reasons: string; showtime_id: number }>(
      `SELECT helpfulness, reasons, showtime_id FROM recommendation_feedback ORDER BY id DESC LIMIT 1`,
    );
    expect(rows[0].helpfulness).toBe('very_helpful');
    expect(JSON.parse(rows[0].reasons)).toEqual(['reason_understood', 'other']);
    expect(rows[0].showtime_id).toBe(1);
  });

  it('feedback_submitted 분석 이벤트가 함께 기록된다', async () => {
    const events = await getAppDbClient().query<{ event_name: string }>(
      `SELECT event_name FROM analytics_events WHERE event_name = 'feedback_submitted'`,
    );
    expect(events.length).toBeGreaterThan(0);
  });
});

describe('실제 선택 기록', () => {
  it('알 수 없는 추천 실행 id는 404', async () => {
    const res = await selection(999_999, { selectionType: 'undecided' });
    expect(res.status).toBe(404);
  });

  it('잘못된 selectionType은 400', async () => {
    const res = await selection(runId, { selectionType: 'made_up_value' });
    expect(res.status).toBe(400);
  });

  it('정상 제출 — 추천된 상영관 선택', async () => {
    const res = await selection(runId, { selectionType: 'picked_recommended', auditoriumId: 1, reasons: ['screen', 'price'] });
    expect(res.status).toBe(201);
    const rows = await getAppDbClient().query<{ selection_type: string; auditorium_id: number; reasons: string }>(
      `SELECT selection_type, auditorium_id, reasons FROM recommendation_selections ORDER BY id DESC LIMIT 1`,
    );
    expect(rows[0].selection_type).toBe('picked_recommended');
    expect(rows[0].auditorium_id).toBe(1);
    expect(JSON.parse(rows[0].reasons)).toEqual(['screen', 'price']);
  });

  it('미결정도 auditoriumId 없이 정상 제출된다', async () => {
    const res = await selection(runId, { selectionType: 'undecided' });
    expect(res.status).toBe(201);
  });
});
