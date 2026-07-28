import type { RecommendationResult } from '../domain/recommendation/types';
import { getAppDbClient } from './client/index';
import type { DbClient } from './client/types';

export function createRecommendationRepository(getDb: () => DbClient) {
  return {
    async saveRun(result: RecommendationResult, latencyMs: number, nowIso: string): Promise<void> {
      await getDb().run(
        `INSERT INTO recommendation_runs (user_id, request, weights, results, latency_ms, created_at)
         VALUES (?,?,?,?,?,?)`,
        [
          'demo-user',
          JSON.stringify(result.request),
          JSON.stringify(result.weights),
          JSON.stringify(
            result.picks.map((p) => ({
              label: p.label,
              showtimeId: p.scored.candidate.showtimeId,
              final: p.scored.final,
              axes: p.scored.axes,
            })),
          ),
          latencyMs,
          nowIso,
        ],
      );
    },
  };
}

export const recommendationRepository = createRecommendationRepository(getAppDbClient);
