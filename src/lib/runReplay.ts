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
  // R21.1: 저장 좌표는 3자리로 축약돼 있어 프리셋은 근사 일치로 찾는다. scrub된(좌표
  // 삭제) 실행은 기본 프리셋으로 폴백 — 정확 재현 대신 조건 재현만 가능함을 감수한다.
  const lat = request.origin?.lat;
  const lng = request.origin?.lng;
  const preset =
    typeof lat === 'number' && typeof lng === 'number'
      ? ORIGIN_PRESETS.find((o) => Math.abs(o.lat - lat) < 0.002 && Math.abs(o.lng - lng) < 0.002)
      : undefined;
  if (preset) {
    p.set('originId', preset.id);
  } else if (typeof lat === 'number' && typeof lng === 'number') {
    p.set('originId', 'custom');
    p.set('originLat', String(lat));
    p.set('originLng', String(lng));
    p.set('originLabel', request.origin.label ?? '재현 위치');
  } else {
    p.set('originId', 'cityhall'); // scrub된 실행 — 좌표 없음
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
