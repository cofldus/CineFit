import packageJson from '../../package.json';
import { recommend } from '../domain/recommendation/engine';
import { blendWeights } from '../domain/recommendation/presets';
import { ACTIVE_POLICY } from '../domain/recommendation/policies/activePolicy';
import type { RecommendationRequest, RecommendationResult } from '../domain/recommendation/types';
import { getAppClock } from '../lib/clock';
import type { RecommendationInput } from '../lib/validation';
import { ORIGIN_PRESETS } from './constants';
import { movieRepository } from './movieRepository';
import { recommendationRepository } from './recommendationRepository';
import { showtimeRepository } from './showtimeRepository';

const CODE_VERSION = packageJson.version;

export type RecommendationServiceResult =
  | { ok: true; result: RecommendationResult }
  | { ok: false; error: 'movie_not_found' };

// 구 'logistics'는 R19 5축 체계에서 distance에 가장 가깝다(이동 최상위 가중).
function normalizePriority(p: RecommendationInput['priority']): RecommendationRequest['priority'] {
  return p === 'logistics' ? 'distance' : p;
}

export function toDomainRequest(input: RecommendationInput): RecommendationRequest {
  // R19: '현재 위치'는 브라우저 좌표를 custom origin으로 받는다 — 정확 주소를 강제하지 않는다.
  const preset = ORIGIN_PRESETS.find((o) => o.id === input.originId) ?? ORIGIN_PRESETS[0];
  const origin =
    input.originId === 'custom' && input.originLat !== undefined && input.originLng !== undefined
      ? { lat: input.originLat, lng: input.originLng, label: input.originLabel ?? '현재 위치' }
      : { lat: preset.lat, lng: preset.lng, label: preset.label };

  return {
    movieId: input.movieId,
    origin,
    date: input.date,
    timeWindow: input.timeWindow,
    timeFrom: input.timeFrom,
    timeTo: input.timeTo,
    maxTravelMinutes: input.maxTravelMinutes,
    // 실효 가격 상한은 getRecommendations가 후보의 일반관 최저가 + 추가 지불 의향으로
    // 파생시켜 덮어쓴다. 구 URL이 절대 상한(maxPrice)을 보냈다면 그 값을 존중한다.
    maxPrice: input.maxPrice ?? Number.MAX_SAFE_INTEGER,
    premiumAllowance: input.premiumAllowance,
    priority: normalizePriority(input.priority),
    prioritySecondary: input.prioritySecondary,
    allowImax: input.allowImax && !input.bigScreenSensitive, // 큰 화면 멀미 → IMAX 확장 화면 제외
    allowDolby: input.allowDolby,
    allowStandard: input.allowStandard,
    motionSickness: input.motionSickness as 0 | 1 | 2,
    subtitleReadability: input.subtitleReadability,
    // 앞쪽 좌석 회피는 "목이 편한 뒤쪽 구역 선호"와 동일한 좌석 목적으로 매핑된다.
    neckComfort: input.neckComfort || input.avoidFront,
    wheelchair: input.wheelchair,
  };
}

// R19: 추가 지불 의향 → 실효 가격 상한. 기준선은 이 조건에서 실제로 고를 수 있는
// 일반관(standard·superplex) 최저가 — 일반관 후보가 없으면 전체 최저가.
export function derivePriceCap(
  candidates: { priceAdult: number; format: string }[],
  allowance: NonNullable<RecommendationRequest['premiumAllowance']>,
): number {
  if (allowance === 'experience_first' || candidates.length === 0) return Number.MAX_SAFE_INTEGER;
  const standard = candidates.filter((c) => c.format === 'standard' || c.format === 'superplex');
  const pool = standard.length > 0 ? standard : candidates;
  const baseline = Math.min(...pool.map((c) => c.priceAdult));
  const extra = { price_first: 0, plus_5000: 5_000, plus_10000: 10_000 }[allowance];
  return baseline + extra;
}

export async function getRecommendations(
  input: RecommendationInput,
  ctx: { sessionId?: string; preview?: boolean } = {},
): Promise<RecommendationServiceResult> {
  const movie = await movieRepository.findById(input.movieId);
  if (!movie) return { ok: false, error: 'movie_not_found' };

  const request = toDomainRequest(input);
  const now = getAppClock().now();
  const all = await showtimeRepository.listCandidates(movie.id, request.date);

  // 관리자 확인(비합성) 회차가 있으면 기본 추천에서 합성 회차 제외.
  // CINEFIT_ALLOW_SYNTHETIC=true(개발·데모)일 때만 함께 노출.
  const verified = all.filter((c) => !c.isSynthetic);
  const allowSynthetic = process.env.CINEFIT_ALLOW_SYNTHETIC === 'true';
  const candidates = verified.length > 0 && !allowSynthetic ? verified : all;

  // R19: 실효 가격 상한 파생(추가 지불 의향 기반) — 구 URL이 절대 상한을 보냈으면 유지.
  if (input.maxPrice === undefined && request.premiumAllowance) {
    request.maxPrice = derivePriceCap(candidates, request.premiumAllowance);
  }
  // R19: 1순위 80% + 2순위 20% 가중치 블렌드.
  const primaryWeights = ACTIVE_POLICY.weights[request.priority];
  const secondaryWeights =
    request.prioritySecondary && request.prioritySecondary !== 'none'
      ? ACTIVE_POLICY.weights[request.prioritySecondary]
      : null;

  const started = performance.now();
  const result = recommend({
    movie,
    candidates,
    request,
    now,
    weightsOverride: blendWeights(primaryWeights, secondaryWeights),
  });
  result.dataMode = {
    usedSynthetic: candidates.some((c) => c.isSynthetic),
    syntheticSuppressed: all.length - candidates.length,
  };
  result.latencyMs = Math.round(performance.now() - started);
  // preview(조건 입력 중 실시간 후보 수 조회)는 run 기록을 남기지 않는다 — 키 입력마다
  // recommendation_runs가 쌓여 퍼널 집계가 오염되는 것을 막는다.
  if (!ctx.preview) {
    result.runId = await recommendationRepository.saveRun(result, result.latencyMs, now.toISOString(), {
      policyVersion: ACTIVE_POLICY.version,
      codeVersion: CODE_VERSION,
      sessionId: ctx.sessionId,
    });
  }

  return { ok: true, result };
}
