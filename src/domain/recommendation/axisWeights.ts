// R20 가중치 모델 — 사용자에게 보이는 축과 엔진이 쓰는 축을 하나의 정수 체계로 통일한다.
// 축은 정확히 4개: 화면·음향 / 좌석 / 이동 / 가격. 시간대는 Step 1의 하드 필터라 축이 아니다.
// 모든 조합에서 합이 "정확히 100"이 되도록 largest remainder 방식으로 반올림을 보정한다.
import type { Priority, RecommendationRequest, Weights } from './types';

export type PriorityAxis = 'screen_sound' | 'seat' | 'travel' | 'price';

export const AXIS_ORDER: PriorityAxis[] = ['screen_sound', 'seat', 'travel', 'price'];

export const AXIS_LABELS: Record<PriorityAxis, string> = {
  screen_sound: '화면·음향',
  seat: '좌석',
  travel: '이동',
  price: '가격',
};

// 우선순위 값 → 축. balance는 특정 축을 밀지 않는다. 구 'logistics'는 이동 축으로 흡수.
const PRIORITY_TO_AXIS: Record<Priority, PriorityAxis | null> = {
  balance: null,
  quality: 'screen_sound',
  seat: 'seat',
  distance: 'travel',
  price: 'price',
  logistics: 'travel',
};

// 상대 배수 — 1순위 3.2 / 2순위 2.3 / 나머지 1. quality+seat 조합이 정확히
// 43/31/13/13이 되는 값이다(균형 선택 시 2순위만 있으면 1.6으로 완만하게).
const PRIMARY_MULT = 3.2;
const SECONDARY_MULT = 2.3;
const SECONDARY_ONLY_MULT = 1.6;

/** 실수 배분을 합계 target의 정수 배분으로 — floor 후 남는 몫을 소수부가 큰 순서로 분배.
    동률이면 앞선 축(AXIS_ORDER 순)이 먼저 받아 결정적이다. */
export function largestRemainder(raw: number[], target: number): number[] {
  const sum = raw.reduce((a, b) => a + b, 0);
  const scaled = raw.map((v) => (v / sum) * target);
  const floors = scaled.map(Math.floor);
  let left = target - floors.reduce((a, b) => a + b, 0);
  const order = scaled
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (const { i } of order) {
    if (left <= 0) break;
    floors[i] += 1;
    left -= 1;
  }
  return floors;
}

export type AxisWeights = Record<PriorityAxis, number>;

/** 1·2순위 선택 → 4축 정수 가중치(합 100 보장). */
export function axisWeights(
  priority: Priority,
  secondary: NonNullable<RecommendationRequest['prioritySecondary']> | Priority = 'none',
): AxisWeights {
  const primaryAxis = PRIORITY_TO_AXIS[priority];
  const secondaryAxis =
    secondary !== 'none' && secondary !== 'balance' && secondary !== 'logistics'
      ? PRIORITY_TO_AXIS[secondary as Priority]
      : secondary === 'logistics'
        ? 'travel'
        : null;
  const raw = AXIS_ORDER.map((axis) => {
    if (axis === primaryAxis) return PRIMARY_MULT;
    if (axis === secondaryAxis) return primaryAxis ? SECONDARY_MULT : SECONDARY_ONLY_MULT;
    return 1;
  });
  const ints = largestRemainder(raw, 100);
  return { screen_sound: ints[0], seat: ints[1], travel: ints[2], price: ints[3] };
}

// 엔진 내부 요인 가중치로 변환 — 화면·음향 축을 포맷 매칭(W1)·상영관 품질(W2)·상영
// 버전 적합(W3)에 45/35/20으로 나눠 싣는다. W5·W6(개인화·접근성)은 스파이크 범위 밖
// 중립값이라 0. 합은 항상 1.
export function toEngineWeights(axes: AxisWeights): Weights {
  const ss = axes.screen_sound / 100;
  return {
    W1: ss * 0.45,
    W2: ss * 0.35,
    W3: ss * 0.2,
    W4: axes.seat / 100,
    W5: 0,
    W6: 0,
    W7: axes.travel / 100,
    W8: axes.price / 100,
  };
}

/** recommendation_runs에 기록하는 정책 버전 — 4축 정수 모델 도입 시점. */
export const AXIS_POLICY_VERSION = 'v3-axis100';
