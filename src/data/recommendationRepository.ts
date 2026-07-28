import type { RecommendationRequest, RecommendationResult } from '../domain/recommendation/types';
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

    /** 관람후 평가 등 후속 기능이 실행 기록을 참조할 때 쓰는 최소 요약 — 저장된 스냅샷을 그대로 읽는다. */
    async getRunSummary(id: number): Promise<{ id: number; movieId: number; showtimeIds: number[] } | null> {
      const rows = await getDb().query<{ id: number; request: string; results: string }>(
        `SELECT id, request, results FROM recommendation_runs WHERE id = ?`,
        [id],
      );
      if (!rows.length) return null;
      const request = JSON.parse(rows[0].request) as { movieId: number };
      const results = JSON.parse(rows[0].results) as { showtimeId: number }[];
      return { id: rows[0].id, movieId: request.movieId, showtimeIds: results.map((r) => r.showtimeId) };
    },

    /** 정책 비교 CLI(scripts/compare-recommendations.ts)용 — 저장된 요청 전체를 그대로 복원한다. */
    async getRunRequest(id: number): Promise<{ request: RecommendationRequest; policyVersion: string | null; createdAt: string } | null> {
      const rows = await getDb().query<{ request: string; policy_version: string | null; created_at: string }>(
        `SELECT request, policy_version, created_at FROM recommendation_runs WHERE id = ?`,
        [id],
      );
      if (!rows.length) return null;
      return {
        request: JSON.parse(rows[0].request) as RecommendationRequest,
        policyVersion: rows[0].policy_version,
        createdAt: rows[0].created_at,
      };
    },
  };
}

export const recommendationRepository = createRecommendationRepository(getAppDbClient);
