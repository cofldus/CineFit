import type { RecommendationResult } from '../domain/recommendation/types';
import { getAppDbClient } from './client/index';
import type { DbClient } from './client/types';

export interface SaveRunOptions {
  policyVersion: string;
  codeVersion: string;
  sessionId?: string;
}

export function createRecommendationRepository(getDb: () => DbClient) {
  return {
    /** 추천 실행 스냅샷을 불변 기록으로 남기고 id를 반환한다 — 이후 피드백·선택·관람후 평가가
     * 이 id를 참조한다. 과거 실행을 현재 데이터로 재계산해 UPDATE하지 않는다(항상 INSERT). */
    async saveRun(result: RecommendationResult, latencyMs: number, nowIso: string, opts: SaveRunOptions): Promise<number> {
      const rows = await getDb().query<{ id: number }>(
        `INSERT INTO recommendation_runs
           (user_id, request, weights, results, excluded, latency_ms, policy_version, code_version, session_id, created_at)
         VALUES (?,?,?,?,?,?,?,?,?,?) RETURNING id`,
        [
          'demo-user',
          JSON.stringify(result.request),
          JSON.stringify(result.weights),
          JSON.stringify(
            result.scored.map((s) => ({
              showtimeId: s.candidate.showtimeId,
              final: s.final,
              axes: s.axes,
              trust: s.trust,
              confidenceLabel: s.confidenceLabel,
            })),
          ),
          JSON.stringify(result.excluded.map((e) => ({ showtimeId: e.candidate.showtimeId, reason: e.reason }))),
          latencyMs,
          opts.policyVersion,
          opts.codeVersion,
          opts.sessionId ?? null,
          nowIso,
        ],
      );
      return rows[0].id;
    },
  };
}

export const recommendationRepository = createRecommendationRepository(getAppDbClient);
