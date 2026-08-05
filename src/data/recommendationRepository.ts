import type { RecommendationTrace } from '../domain/recommendation/trace';
import type { RecommendationRequest, RecommendationResult } from '../domain/recommendation/types';
import { coarseGridId, sanitizeOriginForStorage, LOCATION_RETENTION_DAYS } from '../lib/locationPrivacy';
import { getAppDbClient } from './client/index';
import type { DbClient } from './client/types';

export interface SaveRunOptions {
  policyVersion: string;
  codeVersion: string;
  sessionId?: string;
  /** R21 — 재현 가능한 trace(JSON) */
  trace?: RecommendationTrace;
}

export interface RunListItem {
  id: number;
  createdAt: string;
  policyVersion: string | null;
  movieId: number;
  candidateCount: number;
  excludedCount: number;
  latencyMs: number | null;
}

export function createRecommendationRepository(getDb: () => DbClient) {
  return {
    /** 추천 실행 스냅샷을 불변 기록으로 남기고 id를 반환한다 — 이후 피드백·선택·관람후 평가가
     * 이 id를 참조한다. 과거 실행을 현재 데이터로 재계산해 UPDATE하지 않는다(항상 INSERT). */
    async saveRun(result: RecommendationResult, latencyMs: number, nowIso: string, opts: SaveRunOptions): Promise<number> {
      const rows = await getDb().query<{ id: number }>(
        `INSERT INTO recommendation_runs
           (user_id, request, weights, results, excluded, trace, latency_ms, policy_version, code_version, session_id, created_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?) RETURNING id`,
        [
          'demo-user',
          // R21.1 §4: 좌표는 3자리 축약 + 라벨 화이트리스트 — 정확한 주소·정밀 좌표 저장 금지.
          JSON.stringify({ ...result.request, origin: sanitizeOriginForStorage(result.request.origin) }),
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
          opts.trace ? JSON.stringify(opts.trace) : null,
          latencyMs,
          opts.policyVersion,
          opts.codeVersion,
          opts.sessionId ?? null,
          nowIso,
        ],
      );
      return rows[0].id;
    },

    /** R21.1 §4 — 보존기간이 지난 실행의 좌표를 삭제하고 집계용 grid ID만 남긴다(멱등).
     * maintenance:daily와 privacy:scrub-locations CLI(기존 데이터 정리)가 호출한다. */
    async scrubOldRunLocations(now: Date, retentionDays: number = LOCATION_RETENTION_DAYS): Promise<number> {
      const cutoff = new Date(now.getTime() - retentionDays * 86_400_000).toISOString();
      const rows = await getDb().query<{ id: number; request: string }>(
        `SELECT id, request FROM recommendation_runs WHERE created_at < ?`,
        [cutoff],
      );
      let changed = 0;
      for (const row of rows) {
        let req: { origin?: { lat?: number; lng?: number; label?: string; scrubbed?: boolean } };
        try {
          req = JSON.parse(row.request);
        } catch {
          continue; // 손상 행은 건드리지 않는다
        }
        const origin = req.origin;
        if (!origin || origin.scrubbed || typeof origin.lat !== 'number' || typeof origin.lng !== 'number') continue;
        const scrubbed = {
          label: origin.label ?? '위치 정보 삭제됨',
          gridId: coarseGridId(origin.lat, origin.lng),
          scrubbed: true,
        };
        await getDb().run(`UPDATE recommendation_runs SET request = ? WHERE id = ?`, [
          JSON.stringify({ ...req, origin: scrubbed }),
          row.id,
        ]);
        changed += 1;
      }
      return changed;
    },

    /** R21 관리자 추천 추적 — 최근 실행 목록(요약). */
    async listRecentRuns(limit = 50): Promise<RunListItem[]> {
      const rows = await getDb().query<{
        id: number;
        request: string;
        results: string;
        excluded: string | null;
        policy_version: string | null;
        latency_ms: number | null;
        created_at: string;
      }>(
        `SELECT id, request, results, excluded, policy_version, latency_ms, created_at
         FROM recommendation_runs ORDER BY id DESC LIMIT ?`,
        [limit],
      );
      return rows.map((r) => {
        const request = JSON.parse(r.request) as { movieId: number };
        const results = JSON.parse(r.results) as unknown[];
        const excluded = r.excluded ? (JSON.parse(r.excluded) as unknown[]) : [];
        return {
          id: r.id,
          createdAt: r.created_at,
          policyVersion: r.policy_version,
          movieId: request.movieId,
          candidateCount: results.length,
          excludedCount: excluded.length,
          latencyMs: r.latency_ms,
        };
      });
    },

    /** R21 관리자 추천 추적 — 단일 실행 상세(재현용 전체 스냅샷 + trace). */
    async getRunDetail(id: number): Promise<{
      id: number;
      createdAt: string;
      policyVersion: string | null;
      codeVersion: string | null;
      latencyMs: number | null;
      request: RecommendationRequest;
      trace: RecommendationTrace | null;
    } | null> {
      const rows = await getDb().query<{
        id: number;
        request: string;
        trace: string | null;
        policy_version: string | null;
        code_version: string | null;
        latency_ms: number | null;
        created_at: string;
      }>(
        `SELECT id, request, trace, policy_version, code_version, latency_ms, created_at
         FROM recommendation_runs WHERE id = ?`,
        [id],
      );
      if (!rows.length) return null;
      return {
        id: rows[0].id,
        createdAt: rows[0].created_at,
        policyVersion: rows[0].policy_version,
        codeVersion: rows[0].code_version,
        latencyMs: rows[0].latency_ms,
        request: JSON.parse(rows[0].request) as RecommendationRequest,
        trace: rows[0].trace ? (JSON.parse(rows[0].trace) as RecommendationTrace) : null,
      };
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
