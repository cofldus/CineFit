import { recommend } from '../domain/recommendation/engine';
import type { RecommendationRequest, RecommendationResult } from '../domain/recommendation/types';
import { getAppClock } from '../lib/clock';
import type { RecommendationInput } from '../lib/validation';
import { ORIGIN_PRESETS } from './constants';
import { movieRepository } from './movieRepository';
import { recommendationRepository } from './recommendationRepository';
import { showtimeRepository } from './showtimeRepository';

export type RecommendationServiceResult =
  | { ok: true; result: RecommendationResult }
  | { ok: false; error: 'movie_not_found' };

export function toDomainRequest(input: RecommendationInput): RecommendationRequest {
  const origin = ORIGIN_PRESETS.find((o) => o.id === input.originId) ?? ORIGIN_PRESETS[0];
  return {
    movieId: input.movieId,
    origin: { lat: origin.lat, lng: origin.lng, label: origin.label },
    date: input.date,
    maxTravelMinutes: input.maxTravelMinutes,
    maxPrice: input.maxPrice,
    priority: input.priority,
    allowImax: input.allowImax,
    allowDolby: input.allowDolby,
    allowStandard: input.allowStandard,
    motionSickness: input.motionSickness as 0 | 1 | 2,
    subtitleReadability: input.subtitleReadability,
    neckComfort: input.neckComfort,
    wheelchair: input.wheelchair,
  };
}

export async function getRecommendations(input: RecommendationInput): Promise<RecommendationServiceResult> {
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

  const started = performance.now();
  const result = recommend({ movie, candidates, request, now });
  result.dataMode = {
    usedSynthetic: candidates.some((c) => c.isSynthetic),
    syntheticSuppressed: all.length - candidates.length,
  };
  await recommendationRepository.saveRun(result, Math.round(performance.now() - started), now.toISOString());

  return { ok: true, result };
}
