// API 라우트 핸들러 회귀 테스트 — 실제 시드 DB 필요 (npm run db:seed 선행, CI 동일)
import { describe, expect, it } from 'vitest';
import { POST } from '../../app/api/recommendations/route';

const call = (body: unknown) =>
  POST(
    new Request('http://localhost/api/recommendations', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );

describe('POST /api/recommendations', () => {
  it('정상 요청: 3종 추천과 설명 필드를 반환한다', async () => {
    const res = await call({ movieId: 1 });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.picks).toHaveLength(3);
    expect(json.picks.map((p: { label: string }) => p.label)).toEqual(['균형', '품질', '근접·가성비']);
    const first = json.picks[0].scored;
    expect(first.pros.length).toBeGreaterThan(0);
    expect(first.uncertainties.length).toBeGreaterThan(0);
    expect(first.citations.length).toBeGreaterThan(0);
    expect(first.confidenceLabel).toBeDefined();
  });

  it('입력에 따라 결과가 달라진다 (우선순위 가중치)', async () => {
    const balance = await (await call({ movieId: 1, priority: 'balance' })).json();
    const logistics = await (await call({ movieId: 1, priority: 'logistics' })).json();
    expect(balance.weights).not.toEqual(logistics.weights);
    const finalOf = (j: { picks: { scored: { final: number } }[] }) => j.picks[0].scored.final;
    expect(finalOf(balance)).not.toBeCloseTo(finalOf(logistics), 5);
  });

  it('필수 필드(movieId) 누락 → 400과 친화적 메시지', async () => {
    const res = await call({ priority: 'balance' });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('입력값');
    expect(json.details.length).toBeGreaterThan(0);
  });

  it('존재하지 않는 영화 → 404', async () => {
    const res = await call({ movieId: 99_999 });
    expect(res.status).toBe(404);
  });

  it('모든 후보가 제외되는 조건 → 200 + 빈 추천 + 제외 사유 유지', async () => {
    const res = await call({ movieId: 1, maxTravelMinutes: 5 });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.picks).toHaveLength(0);
    expect(json.excluded.length).toBeGreaterThan(0);
    expect(json.excluded[0].reason).toBeDefined();
  });

  it('잘못된 가격·이동 시간 값 → 400', async () => {
    expect((await call({ movieId: 1, maxPrice: -1 })).status).toBe(400);
    expect((await call({ movieId: 1, maxTravelMinutes: 999 })).status).toBe(400);
  });

  it('JSON이 아닌 본문 → 400', async () => {
    const res = await POST(
      new Request('http://localhost/api/recommendations', { method: 'POST', body: 'not-json' }),
    );
    expect(res.status).toBe(400);
  });
});
