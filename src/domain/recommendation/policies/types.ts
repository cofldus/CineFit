import type { Priority, Weights } from '../types';

export interface RecommendationPolicy {
  version: string;
  weights: Record<Priority, Weights>;
}
