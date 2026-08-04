// R19 — 추가 지불 의향 → 실효 가격 상한 파생, 상영 시작 시간대 하드 필터.
import { describe, expect, it } from 'vitest';
import { recommend } from '../../src/domain/recommendation/engine';
import { derivePriceCap } from '../../src/data/recommendationService';
import type { RecommendationRequest } from '../../src/domain/recommendation/types';
import { makeCandidate, makeMovie, makeRequest, NOW, spec } from '../fixtures';

describe('derivePriceCap', () => {
  const candidates = [
    { priceAdult: 15_000, format: 'standard' },
    { priceAdult: 18_000, format: 'superplex' },
    { priceAdult: 28_000, format: 'imax' },
  ];

  it('기준선은 일반관(standard·superplex) 최저가다', () => {
    expect(derivePriceCap(candidates, 'price_first')).toBe(15_000);
    expect(derivePriceCap(candidates, 'plus_5000')).toBe(20_000);
    expect(derivePriceCap(candidates, 'plus_10000')).toBe(25_000);
  });

  it('experience_first는 상한을 두지 않는다', () => {
    expect(derivePriceCap(candidates, 'experience_first')).toBe(Number.MAX_SAFE_INTEGER);
  });

  it('일반관 후보가 없으면 전체 최저가를 기준선으로 쓴다', () => {
    const imaxOnly = [{ priceAdult: 26_000, format: 'imax' }];
    expect(derivePriceCap(imaxOnly, 'plus_5000')).toBe(31_000);
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
