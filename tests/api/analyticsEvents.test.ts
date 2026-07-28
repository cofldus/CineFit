// 분석 이벤트 API 회귀 테스트 — 임시 DB에 직접 시드 (라이브 DB 파일 복사 금지)
import { execSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

process.env.CINEFIT_DB_PATH = join(mkdtempSync(join(tmpdir(), 'cinefit-analytics-')), 'analytics-test.db');
process.env.CINEFIT_CLOCK_MODE = 'demo';

import { getAppDbClient } from '../../src/data/client/index';
import { POST as postEvent } from '../../app/api/analytics/events/route';

const url = 'http://localhost/api/analytics/events';

function post(body: unknown, cookie?: string) {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (cookie) headers.cookie = cookie;
  return postEvent(new Request(url, { method: 'POST', headers, body: JSON.stringify(body) }));
}

/** Set-Cookie 헤더에서 세션 쿠키 값만 추출 — 다음 요청에 그대로 실어 세션을 이어간다 */
function sessionCookieFrom(res: Response): string {
  const setCookie = res.headers.get('set-cookie') ?? '';
  const match = setCookie.match(/cinefit_session=([^;]+)/);
  if (!match) throw new Error('세션 쿠키가 응답에 없습니다');
  return `cinefit_session=${match[1]}`;
}

beforeAll(() => {
  const env = { ...process.env };
  execSync('node spikes/minimal-db/seed.mjs', { env });
  execSync('node db/migrate.mjs', { env });
  execSync('node db/seed-seat-zones.mjs', { env });
  execSync('node db/seed-aliases.mjs', { env });
});

describe('분석 이벤트 수집', () => {
  it('알 수 없는 이벤트는 400', async () => {
    const res = await post({ event: 'not_a_real_event', properties: {} });
    expect(res.status).toBe(400);
  });

  it('필수 속성이 빠지면 400', async () => {
    const res = await post({ event: 'movie_viewed', properties: {} }); // movieId 누락
    expect(res.status).toBe(400);
  });

  it('정상 이벤트는 204 + 세션 쿠키 발급, DB에 저장된다', async () => {
    const res = await post({ event: 'movie_viewed', properties: { movieId: 1 } });
    expect(res.status).toBe(204);
    const cookie = sessionCookieFrom(res);

    const rows = await getAppDbClient().query<{ event_name: string; properties: string; session_id: string }>(
      `SELECT event_name, properties, session_id FROM analytics_events ORDER BY id DESC LIMIT 1`,
    );
    expect(rows[0].event_name).toBe('movie_viewed');
    expect(JSON.parse(rows[0].properties)).toEqual({ movieId: 1 });

    const sessions = await getAppDbClient().query<{ id: string }>(
      `SELECT id FROM analytics_sessions WHERE id = ?`,
      [rows[0].session_id],
    );
    expect(sessions).toHaveLength(1);
    void cookie;
  });

  it('같은 세션 쿠키로 재요청하면 세션이 재사용되고 last_seen_at만 갱신된다', async () => {
    const first = await post({ event: 'app_opened', properties: {} });
    const cookie = sessionCookieFrom(first);

    const before = await getAppDbClient().query<{ id: string; first_seen_at: string }>(
      `SELECT id, first_seen_at FROM analytics_sessions ORDER BY first_seen_at DESC LIMIT 1`,
    );

    const second = await post({ event: 'app_opened', properties: {} }, cookie);
    expect(second.status).toBe(204);
    // 이미 쿠키가 있는 요청에는 새 Set-Cookie를 다시 굽지 않는다
    expect(second.headers.get('set-cookie')).toBeNull();

    const sessions = await getAppDbClient().query<{ id: string; first_seen_at: string }>(
      `SELECT id, first_seen_at FROM analytics_sessions WHERE id = ?`,
      [before[0].id],
    );
    expect(sessions).toHaveLength(1); // 새 세션이 또 생기지 않음
    expect(sessions[0].first_seen_at).toBe(before[0].first_seen_at); // 최초 방문 시각은 불변
  });

  it('스키마에 없는 속성(위치·IP 등)은 조용히 제거되고 저장되지 않는다', async () => {
    const res = await post({
      event: 'movie_viewed',
      properties: { movieId: 2, lat: 37.5, lng: 127.0, ip: '1.2.3.4', freeText: '개인정보 포함될 수도 있는 자유 입력' },
    });
    expect(res.status).toBe(204);
    const rows = await getAppDbClient().query<{ properties: string }>(
      `SELECT properties FROM analytics_events ORDER BY id DESC LIMIT 1`,
    );
    const stored = JSON.parse(rows[0].properties);
    expect(stored).toEqual({ movieId: 2 });
    expect(stored.lat).toBeUndefined();
    expect(stored.ip).toBeUndefined();
    expect(stored.freeText).toBeUndefined();
  });

  it('추천 완료 이벤트 — 전체 스키마 검증', async () => {
    const res = await post({
      event: 'recommendation_completed',
      properties: {
        recommendationRunId: 1,
        movieId: 1,
        candidateCount: 7,
        resultTypes: ['균형', '품질', '근접·가성비'],
        processingTimeMs: 12,
        dataConfidenceBucket: '보통',
        syntheticDataUsed: true,
      },
    });
    expect(res.status).toBe(204);
  });

  it('잘못된 JSON 본문은 400', async () => {
    const res = await postEvent(
      new Request(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{not json' }),
    );
    expect(res.status).toBe(400);
  });
});
