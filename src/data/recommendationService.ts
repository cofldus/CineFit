import { recommend } from '../domain/recommendation/engine';
import type { RecommendationRequest, RecommendationResult } from '../domain/recommendation/types';
import type { RecommendationInput } from '../lib/validation';
import { DEMO_NOW, ORIGIN_PRESETS } from './constants';
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

export function getRecommendations(input: RecommendationInput): RecommendationServiceResult {
  const movie = movieRepository.findById(input.movieId);
  if (!movie) return { ok: false, error: 'movie_not_found' };

  const request = toDomainRequest(input);
  const candidates = showtimeRepository.listCandidates(movie.id, request.date);

  const started = performance.now();
  const result = recommend({ movie, candidates, request, now: DEMO_NOW });
  recommendationRepository.saveRun(result, Math.round(performance.now() - started));

  return { ok: true, result };
}
