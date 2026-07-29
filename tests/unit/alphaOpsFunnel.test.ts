import { describe, expect, it } from 'vitest';
import { computeFunnelPercentages } from '../../src/domain/alphaOps/funnel';

describe('computeFunnelPercentages', () => {
  it('첫 단계를 100%로 두고 이후 단계의 도달률을 계산한다', () => {
    const result = computeFunnelPercentages([
      { key: 'app_opened', label: '앱 열림', sessionCount: 100 },
      { key: 'movie_selected', label: '영화 선택', sessionCount: 40 },
      { key: 'recommendation_completed', label: '추천 완료', sessionCount: 10 },
    ]);
    expect(result[0].percentOfFirst).toBe(100);
    expect(result[1].percentOfFirst).toBe(40);
    expect(result[2].percentOfFirst).toBe(10);
  });

  it('소수점 첫째 자리까지 반올림한다', () => {
    const result = computeFunnelPercentages([
      { key: 'app_opened', label: '앱 열림', sessionCount: 3 },
      { key: 'movie_selected', label: '영화 선택', sessionCount: 1 },
    ]);
    expect(result[1].percentOfFirst).toBe(33.3);
  });

  it('첫 단계가 0건이면 0으로 나누지 않고 전부 0%를 반환한다', () => {
    const result = computeFunnelPercentages([
      { key: 'app_opened', label: '앱 열림', sessionCount: 0 },
      { key: 'movie_selected', label: '영화 선택', sessionCount: 0 },
    ]);
    expect(result[0].percentOfFirst).toBe(0);
    expect(result[1].percentOfFirst).toBe(0);
  });

  it('빈 배열을 넣어도 예외 없이 빈 배열을 반환한다', () => {
    expect(computeFunnelPercentages([])).toEqual([]);
  });
});
