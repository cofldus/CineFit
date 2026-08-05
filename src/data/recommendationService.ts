import packageJson from '../../package.json';
import { recommend } from '../domain/recommendation/engine';
import { AXIS_POLICY_VERSION, axisWeights, toEngineWeights } from '../domain/recommendation/axisWeights';
import { buildTrace } from '../domain/recommendation/trace';
import { gateCandidates, syntheticAllowed } from '../domain/recommendation/verificationGate';
import { deriveCandidateDataState } from '../lib/dataFreshness';
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
    // R20: 가격은 soft preference. 하드 상한(maxPrice)은 구 URL이 절대 상한을 보냈을
    // 때만 유효하고, 새 플로우의 추가 지불 의향은 priceRef(감점 기준)로만 반영된다 —
    // getRecommendations가 후보의 일반관 최저가 + 의향으로 파생시켜 채운다.
    maxPrice: input.maxPrice ?? Number.MAX_SAFE_INTEGER,
    premiumAllowance: input.premiumAllowance,
    priority: normalizePriority(input.priority),
    prioritySecondary: input.prioritySecondary,
    // R20: 큰 화면 멀미는 IMAX 하드 제외가 아니라 화면 축 감점(avoidBigScreen).
    allowImax: input.allowImax,
    avoidBigScreen: input.bigScreenSensitive,
    allowDolby: input.allowDolby,
    allowStandard: input.allowStandard,
    motionSickness: input.motionSickness as 0 | 1 | 2,
    subtitleReadability: input.subtitleReadability,
    // 앞쪽 좌석 회피는 "목이 편한 뒤쪽 구역 선호"와 동일한 좌석 목적으로 매핑된다.
    neckComfort: input.neckComfort || input.avoidFront,
    wheelchair: input.wheelchair,
  };
}

// R20: 추가 지불 의향 → 가격 soft 기준(priceRef). 기준선은 이 조건에서 실제로 고를 수
// 있는 일반관(standard·superplex) 최저가 — 일반관 후보가 없으면 전체 최저가.
// '가격 차이를 크게 고려하지 않음'(experience_first)은 기준 자체가 없어 null.
// 이 값은 하드 상한이 아니라 초과분 감점의 기준일 뿐이다(엔진 scoreCandidate).
export function derivePriceRef(
  candidates: { priceAdult: number; format: string }[],
  allowance: NonNullable<RecommendationRequest['premiumAllowance']>,
): number | null {
  if (allowance === 'experience_first' || candidates.length === 0) return null;
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

  // R21.1 §3 — verified-only 게이트(코드 강제): 비합성·verified·미만료·source URL 유효·
  // stale 이내 회차만 추천에 포함. 합성은 프로덕션에서 절대 불가, 개발·E2E에선 verified가
  // 전무할 때의 폴백. 게이트 제외분은 excluded(stage='verification')로 trace에 남는다.
  const { eligible: candidates, gated } = gateCandidates(all, { now, allowSynthetic: syntheticAllowed() });

  // R20: 가격 soft 기준 파생(추가 지불 의향 기반) — 하드 상한이 아니라 감점 기준.
  // 구 URL이 절대 상한(maxPrice)을 보냈으면 그 하드 필터는 toDomainRequest에서 이미
  // 반영돼 있고, soft 기준은 중복 적용하지 않는다.
  if (input.maxPrice === undefined && request.premiumAllowance) {
    request.priceRef = derivePriceRef(candidates, request.premiumAllowance);
  }
  // R20: 4축 정수 가중치(합 100) — 1·2순위 선택을 largest remainder로 정규화한 뒤
  // 엔진 요인 가중치로 변환한다. 사용자 화면(가중치 배분)과 완전히 같은 값을 쓴다.
  const weights = toEngineWeights(axisWeights(request.priority, request.prioritySecondary ?? 'none'));

  const started = performance.now();
  const result = recommend({
    movie,
    candidates,
    request,
    now,
    weightsOverride: weights,
  });
  // 게이트 제외를 결과에 편입 — totalCandidates는 조회된 전체(게이트 포함),
  // eligibleCandidates는 게이트 통과분(미리보기 상태·퍼널 기준).
  result.excluded = [...gated, ...result.excluded];
  result.totalCandidates = all.length;
  result.eligibleCandidates = candidates.length;
  result.dataMode = {
    usedSynthetic: candidates.some((c) => c.isSynthetic),
    syntheticSuppressed: gated.filter((g) => g.candidate.isSynthetic).length,
  };
  result.latencyMs = Math.round(performance.now() - started);
  // preview(조건 입력 중 실시간 후보 수 조회)는 run 기록을 남기지 않는다 — 키 입력마다
  // recommendation_runs가 쌓여 퍼널 집계가 오염되는 것을 막는다.
  if (!ctx.preview) {
    // R21 §3: 실행마다 재현 가능한 trace 저장 — 퍼널 전후 카운트·후보별 제외 사유·
    // 4축 점수·soft penalty·최종 순위·데이터 상태.
    const trace = buildTrace({
      result,
      policyVersion: AXIS_POLICY_VERSION,
      generatedAt: now.toISOString(),
      dataState: deriveCandidateDataState({
        // 게이트 통과분 기준 — 프로덕션에서 합성만 있으면 '연결 전(none)'이 맞다.
        total: candidates.length,
        usedSynthetic: result.dataMode?.usedSynthetic ?? false,
      }),
    });
    result.runId = await recommendationRepository.saveRun(result, result.latencyMs, now.toISOString(), {
      policyVersion: AXIS_POLICY_VERSION,
      codeVersion: CODE_VERSION,
      sessionId: ctx.sessionId,
      trace,
    });
  }

  return { ok: true, result };
}
