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
      timeWindow: 'any',
      // R19: 절대 예산은 기본값이 없다 — 추가 지불 의향에서 실효 상한을 파생한다.
      premiumAllowance: 'experience_first',
      priority: 'balance',
      prioritySecondary: 'none',
      allowImax: true,
      allowDolby: true,
      allowStandard: true,
      motionSickness: 0,
      avoidFront: false,
      bigScreenSensitive: false,
      wheelchair: false,
    });
    expect(r.input.maxPrice).toBeUndefined();
  });

  it('R19 신규 필드를 파싱한다 — 시간대 custom 범위·현재 위치 좌표', () => {
    const r = parseRecommendationInput({
      movieId: 1,
      timeWindow: 'custom',
      timeFrom: '18:00',
      timeTo: '21:30',
      originId: 'custom',
      originLat: '37.5926',
      originLng: '127.0165',
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.input.timeFrom).toBe('18:00');
    expect(r.input.originLat).toBeCloseTo(37.5926);
  });

  it('custom 시간대에 범위가 없거나 custom 위치에 좌표가 없으면 실패한다', () => {
    expect(parseRecommendationInput({ movieId: 1, timeWindow: 'custom' }).ok).toBe(false);
    expect(parseRecommendationInput({ movieId: 1, originId: 'custom' }).ok).toBe(false);
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
