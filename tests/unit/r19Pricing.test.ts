// R19→R20 — 추가 지불 의향은 soft preference: 기준(priceRef) 파생 + 초과분 감점(제외
// 없음). 상영 시작 시간대는 여전히 하드 필터.
import { describe, expect, it } from 'vitest';
import { recommend } from '../../src/domain/recommendation/engine';
import { derivePriceRef } from '../../src/data/recommendationService';
import type { RecommendationRequest } from '../../src/domain/recommendation/types';
import { makeCandidate, makeMovie, makeRequest, NOW, spec } from '../fixtures';

describe('derivePriceRef', () => {
  const candidates = [
    { priceAdult: 15_000, format: 'standard' },
    { priceAdult: 18_000, format: 'superplex' },
    { priceAdult: 28_000, format: 'imax' },
  ];

  it('기준선은 일반관(standard·superplex) 최저가다', () => {
    expect(derivePriceRef(candidates, 'price_first')).toBe(15_000);
    expect(derivePriceRef(candidates, 'plus_5000')).toBe(20_000);
    expect(derivePriceRef(candidates, 'plus_10000')).toBe(25_000);
  });

  it('experience_first(가격 차이 크게 미반영)는 기준 자체가 없다', () => {
    expect(derivePriceRef(candidates, 'experience_first')).toBeNull();
  });

  it('일반관 후보가 없으면 전체 최저가를 기준선으로 쓴다', () => {
    const imaxOnly = [{ priceAdult: 26_000, format: 'imax' }];
    expect(derivePriceRef(imaxOnly, 'plus_5000')).toBe(31_000);
  });
});

describe('가격 soft preference (R20 §4)', () => {
  const movie = makeMovie({ format_versions: spec(['standard', 'imax']) });

  it('priceRef를 넘는 후보는 제외되지 않고 감점 사유만 남는다', () => {
    const cheap = makeCandidate({ format: 'standard', price: 15_000 });
    const pricey = makeCandidate({ format: 'imax', price: 28_000 });
    const r = recommend({
      movie,
      candidates: [cheap, pricey],
      request: makeRequest({ maxPrice: Number.MAX_SAFE_INTEGER, priceRef: 20_000 }),
      now: NOW,
    });
    // 두 후보 모두 살아 있다 — 가격은 하드 필터가 아니다.
    expect(r.scored).toHaveLength(2);
    expect(r.excluded).toHaveLength(0);
    const priceyScored = r.scored.find((s) => s.candidate.priceAdult === 28_000)!;
    expect(priceyScored.cons.join(' ')).toContain('감점');
  });

  it('priceRef 초과 후보는 같은 조건의 기준 내 후보보다 가격 축 점수가 낮다', () => {
    const inRef = makeCandidate({ format: 'standard', price: 18_000 });
    const overRef = makeCandidate({ format: 'standard', price: 30_000 });
    const r = recommend({
      movie,
      candidates: [inRef, overRef],
      request: makeRequest({ maxPrice: Number.MAX_SAFE_INTEGER, priceRef: 20_000 }),
      now: NOW,
    });
    const a = r.scored.find((s) => s.candidate.priceAdult === 18_000)!;
    const b = r.scored.find((s) => s.candidate.priceAdult === 30_000)!;
    expect(b.axes.pv).toBeLessThan(a.axes.pv);
  });

  it('구 URL의 절대 상한(maxPrice)은 여전히 하드 필터로 동작한다', () => {
    const pricey = makeCandidate({ format: 'standard', price: 30_000 });
    const r = recommend({
      movie,
      candidates: [pricey],
      request: makeRequest({ maxPrice: 20_000 }),
      now: NOW,
    });
    expect(r.scored).toHaveLength(0);
    expect(r.excluded[0]?.reason).toContain('상한');
  });
});

describe('상영 시작 시간대 필터', () => {
  const movie = makeMovie({ format_versions: spec(['standard']) });
  // fixtures 기본 startsAt = 2026-07-28T19:00+09:00 (저녁). 배급 버전 미확인 필터를 피하기
  // 위해 일반관 후보를 쓴다 — 이 테스트의 관심사는 시간대 필터 하나다.
  const evening = makeCandidate({ format: 'standard', price: 15_000 });
  const run = (timeWindow: RecommendationRequest['timeWindow'], extra: Partial<RecommendationRequest> = {}) =>
    recommend({
      movie,
      candidates: [evening],
      request: makeRequest({ timeWindow, ...extra }),
      now: NOW,
    });

  it('저녁(17–22시) 창은 19:00 시작 회차를 통과시킨다', () => {
    expect(run('evening').picks.length).toBeGreaterThan(0);
  });

  it('오전 창은 19:00 시작 회차를 제외하고 사유를 남긴다', () => {
    const r = run('morning');
    expect(r.picks).toHaveLength(0);
    expect(r.excluded[0]?.reason).toContain('희망 시간대');
  });

  it('custom 범위는 시작 시각이 범위 안일 때만 통과한다', () => {
    expect(run('custom', { timeFrom: '18:00', timeTo: '20:00' }).picks.length).toBeGreaterThan(0);
    expect(run('custom', { timeFrom: '10:00', timeTo: '12:00' }).picks).toHaveLength(0);
  });
});
