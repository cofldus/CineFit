import type { Priority, Weights } from './types';

// topPriority 가중치 프리셋 (문서 05 §5)
// R19: 우선순위 5축(+구 logistics 호환). 각 프리셋은 합이 1.0 — seat는 좌석 축(W4),
// distance는 이동 축(W7), price는 가격 축(W8)을 각각 최상위로 끌어올린 변형이다.
export const WEIGHT_PRESETS: Record<Priority, Weights> = {
  balance: { W1: 0.18, W2: 0.15, W3: 0.12, W4: 0.12, W5: 0.1, W6: 0.05, W7: 0.18, W8: 0.1 },
  quality: { W1: 0.25, W2: 0.22, W3: 0.15, W4: 0.1, W5: 0.08, W6: 0.05, W7: 0.1, W8: 0.05 },
  seat: { W1: 0.14, W2: 0.12, W3: 0.1, W4: 0.28, W5: 0.1, W6: 0.05, W7: 0.13, W8: 0.08 },
  distance: { W1: 0.1, W2: 0.08, W3: 0.08, W4: 0.08, W5: 0.08, W6: 0.05, W7: 0.38, W8: 0.15 },
  price: { W1: 0.1, W2: 0.08, W3: 0.08, W4: 0.08, W5: 0.08, W6: 0.05, W7: 0.15, W8: 0.38 },
  logistics: { W1: 0.1, W2: 0.08, W3: 0.08, W4: 0.08, W5: 0.08, W6: 0.05, W7: 0.3, W8: 0.23 },
};

// 1순위 80% + 2순위 20% 블렌드 — 두 프리셋 모두 합이 1이므로 결과도 합 1을 유지한다.
export function blendWeights(primary: Weights, secondary: Weights | null): Weights {
  if (!secondary) return primary;
  const mix = (a: number, b: number) => a * 0.8 + b * 0.2;
  return {
    W1: mix(primary.W1, secondary.W1), W2: mix(primary.W2, secondary.W2),
    W3: mix(primary.W3, secondary.W3), W4: mix(primary.W4, secondary.W4),
    W5: mix(primary.W5, secondary.W5), W6: mix(primary.W6, secondary.W6),
    W7: mix(primary.W7, secondary.W7), W8: mix(primary.W8, secondary.W8),
  };
}

export const PRIORITY_LABELS: Record<Priority, string> = {
  balance: '균형',
  quality: '영상·음향 품질',
  seat: '좌석',
  distance: '이동 거리',
  price: '가격',
  logistics: '이동·편의',
};

export const FORMAT_LABELS: Record<string, string> = {
  imax: 'IMAX',
  dolby_cinema: '돌비시네마',
  '4dx': '4DX',
  superplex: '수퍼플렉스',
  standard: '일반',
  // KOBIS 배급 포맷 버전에 등장하는 값 — CineFit이 추천하는 상영관 브랜드는 아니지만
  // 영화 카드 배지에 원문 그대로('screenx') 새는 것을 막는다.
  screenx: 'ScreenX',
};

// 사용자에게는 쉬운 말로 노출 — 원래 상태 값(official 등)은 내부 로직에서만 사용 (docs/09 §1.3)
export const INFO_STATUS_LABELS: Record<string, string> = {
  official: '공식 확인',
  multi_source: '여러 출처 확인',
  user_report: '사용자 제보',
  single_unverified: '출처 1곳(미확인)',
  estimated: '추정치',
  rumor: '확인 안 됨',
  outdated: '오래된 정보',
  conflict: '정보 엇갈림',
};

// 검증된 사양으로 인정하는 등급 (문서 05 §4.1)
export const VERIFIED_STATUSES = new Set(['official', 'multi_source']);
