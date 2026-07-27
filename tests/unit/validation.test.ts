import { describe, expect, it } from 'vitest';
import { parseRecommendationInput } from '../../src/lib/validation';

describe('추천 입력 검증', () => {
  it('movieId만 주면 나머지는 기본값으로 채운다', () => {
    const r = parseRecommendationInput({ movieId: '1' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.input).toMatchObject({
      movieId: 1,
      maxTravelMinutes: 60,
      maxPrice: 40_000,
      priority: 'balance',
      allowImax: true,
      allowDolby: true,
      allowStandard: true,
      motionSickness: 0,
      wheelchair: false,
    });
  });

  it('폼 쿼리의 문자열 불리언(true/false)을 해석한다', () => {
    const r = parseRecommendationInput({ movieId: '2', allowImax: 'false', wheelchair: 'true' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.input.allowImax).toBe(false);
    expect(r.input.wheelchair).toBe(true);
  });

  it('movieId 누락은 실패한다', () => {
    const r = parseRecommendationInput({});
    expect(r.ok).toBe(false);
  });

  it('잘못된 이동 시간·가격 값을 거부한다', () => {
    expect(parseRecommendationInput({ movieId: 1, maxTravelMinutes: -5 }).ok).toBe(false);
    expect(parseRecommendationInput({ movieId: 1, maxPrice: 100 }).ok).toBe(false);
    expect(parseRecommendationInput({ movieId: 1, maxTravelMinutes: 'abc' }).ok).toBe(false);
  });
});
