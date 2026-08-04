// R20 §3 — 4축 정수 가중치 모델: 모든 1·2순위 조합에서 합이 정확히 100.
import { describe, expect, it } from 'vitest';
import {
  AXIS_ORDER,
  axisWeights,
  largestRemainder,
  toEngineWeights,
} from '../../src/domain/recommendation/axisWeights';
import type { Priority } from '../../src/domain/recommendation/types';

const PRIORITIES: Priority[] = ['balance', 'quality', 'seat', 'distance', 'price', 'logistics'];
const SECONDARIES = ['none', 'quality', 'seat', 'distance', 'price'] as const;

describe('axisWeights', () => {
  it('모든 우선순위 조합에서 정수이고 합이 정확히 100이다', () => {
    for (const p of PRIORITIES) {
      for (const s of SECONDARIES) {
        const w = axisWeights(p, s);
        const values = AXIS_ORDER.map((a) => w[a]);
        for (const v of values) expect(Number.isInteger(v)).toBe(true);
        expect(values.reduce((a, b) => a + b, 0)).toBe(100);
      }
    }
  });

  it('브리프 예시 — 1순위 화면·음향 + 2순위 좌석 = 43/31/13/13', () => {
    expect(axisWeights('quality', 'seat')).toEqual({
      screen_sound: 43,
      seat: 31,
      travel: 13,
      price: 13,
    });
  });

  it('균형 + 2순위 없음 = 정확히 25/25/25/25', () => {
    expect(axisWeights('balance', 'none')).toEqual({
      screen_sound: 25,
      seat: 25,
      travel: 25,
      price: 25,
    });
  });

  it('1순위 축이 항상 가장 큰 가중치를 받는다', () => {
    const w = axisWeights('price', 'seat');
    expect(w.price).toBeGreaterThan(w.seat);
    expect(w.seat).toBeGreaterThan(w.travel);
  });

  it('구 logistics는 이동 축으로 흡수된다', () => {
    expect(axisWeights('logistics', 'none').travel).toBe(axisWeights('distance', 'none').travel);
  });
});

describe('largestRemainder', () => {
  it('반올림 후에도 합이 target과 정확히 일치한다', () => {
    expect(largestRemainder([1, 1, 1], 100).reduce((a, b) => a + b, 0)).toBe(100);
    expect(largestRemainder([3.2, 2.3, 1, 1], 100)).toEqual([43, 31, 13, 13]);
  });
});

describe('toEngineWeights', () => {
  it('엔진 요인 가중치의 합이 1이다', () => {
    for (const p of PRIORITIES) {
      const W = toEngineWeights(axisWeights(p, 'none'));
      const sum = W.W1 + W.W2 + W.W3 + W.W4 + W.W5 + W.W6 + W.W7 + W.W8;
      expect(sum).toBeCloseTo(1, 10);
    }
  });
});
