// R21 — 저장된 추천 실행(request 스냅샷)을 /results URL로 복원한다. 관리자 추적 화면의
// "이 조건으로 재현" 링크용. avoidFront는 저장 시 neckComfort로 흡수돼 있어 그대로 복원한다.
import { ORIGIN_PRESETS } from '../data/constants';
import type { RecommendationRequest } from '../domain/recommendation/types';

export function replayUrl(request: RecommendationRequest): string {
  const p = new URLSearchParams();
  p.set('movieId', String(request.movieId));
  p.set('date', request.date);
  p.set('timeWindow', request.timeWindow ?? 'any');
  if (request.timeWindow === 'custom') {
    if (request.timeFrom) p.set('timeFrom', request.timeFrom);
    if (request.timeTo) p.set('timeTo', request.timeTo);
  }
  const preset = ORIGIN_PRESETS.find((o) => o.lat === request.origin.lat && o.lng === request.origin.lng);
  if (preset) {
    p.set('originId', preset.id);
  } else {
    p.set('originId', 'custom');
    p.set('originLat', String(request.origin.lat));
    p.set('originLng', String(request.origin.lng));
    p.set('originLabel', request.origin.label ?? '재현 위치');
  }
  p.set('maxTravelMinutes', String(request.maxTravelMinutes));
  if (request.maxPrice < Number.MAX_SAFE_INTEGER / 2) p.set('maxPrice', String(request.maxPrice));
  p.set('premiumAllowance', request.premiumAllowance ?? 'experience_first');
  p.set('priority', request.priority === 'logistics' ? 'distance' : request.priority);
  p.set('prioritySecondary', request.prioritySecondary ?? 'none');
  p.set('allowImax', String(request.allowImax));
  p.set('allowDolby', String(request.allowDolby));
  p.set('allowStandard', String(request.allowStandard));
  p.set('motionSickness', String(request.motionSickness));
  p.set('bigScreenSensitive', String(Boolean(request.avoidBigScreen)));
  p.set('subtitleReadability', String(request.subtitleReadability));
  p.set('neckComfort', String(request.neckComfort));
  p.set('wheelchair', String(request.wheelchair));
  return `/results?${p.toString()}`;
}
