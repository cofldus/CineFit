import type { RecommendationResult } from '../domain/recommendation/types';
import { getDb } from './db';

export const recommendationRepository = {
  saveRun(result: RecommendationResult, latencyMs: number): void {
    getDb()
      .prepare(`INSERT INTO recommendation_runs (user_id, request, weights, results, latency_ms) VALUES (?,?,?,?,?)`)
      .run(
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
      );
  },
};
