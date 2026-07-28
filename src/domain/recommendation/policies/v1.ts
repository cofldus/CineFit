// 정책 v1 — 현재 운영 중인 가중치(src/domain/recommendation/presets.ts WEIGHT_PRESETS)를
// 그대로 담은 최초 버전. 새 정책을 만들 때는 이 파일을 복사해 v2.ts 등으로 만들고
// activePolicy.ts만 바꾼다 — 과거 실행 기록은 재현 가능해야 하므로 v1.ts 자체는 수정하지 않는다.
import { WEIGHT_PRESETS } from '../presets';
import type { RecommendationPolicy } from './types';

export const POLICY_V1: RecommendationPolicy = {
  version: 'v1',
  weights: WEIGHT_PRESETS,
};
