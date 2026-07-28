// 정책 v2 — v1과 비교(npm run eval:recommendations -- --compare=v1,v2)를 실제로 시연하기
// 위한 예시 변형이다. 실제 운영 후보가 아니다 — activePolicy.ts는 여전히 v1을 가리킨다.
// 차이: 이동·편의(W7 거리, W8 가격) 비중을 낮추고 포맷·상영관 품질(W1,W2) 비중을 높인
// "품질 우선 강화" 실험안. 실제로 이렇게 바꿀지는 골든셋 회귀 결과를 보고 판단한다.
import { WEIGHT_PRESETS } from '../presets';
import type { RecommendationPolicy } from './types';

export const POLICY_V2: RecommendationPolicy = {
  version: 'v2',
  weights: {
    balance: { ...WEIGHT_PRESETS.balance, W1: 0.22, W2: 0.19, W7: 0.13, W8: 0.07 },
    quality: WEIGHT_PRESETS.quality,
    logistics: WEIGHT_PRESETS.logistics,
  },
};
