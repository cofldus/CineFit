import type { AuditoriumSpec, FormatId, RecommendationRequest, SeatZone, SeatZoneSuggestion } from './types';

// 사용자 조건 → 원하는 좌석 존 목적 (docs/06 §3.2 purpose 어휘)
export function desiredPurposes(
  format: FormatId,
  request: Pick<RecommendationRequest, 'subtitleReadability' | 'neckComfort' | 'motionSickness'>,
): string[] {
  const purposes: string[] = [];
  if (format === 'superplex') purposes.push('overview');
  else if (format === '4dx' && request.motionSickness >= 1) purposes.push('low_motion');
  else purposes.push('immersive');
  if (request.subtitleReadability) purposes.push('subtitle');
  if (request.neckComfort) purposes.push('neck_easy');
  return purposes;
}

/** 원하는 목적과 겹치는 존을 신뢰도 가중으로 선택 */
export function matchZones(zones: SeatZone[], desired: string[]): SeatZone[] {
  return zones
    .filter((z) => z.purposes.some((p) => desired.includes(p)))
    .sort((a, b) => {
      const cover = (z: SeatZone) => z.purposes.filter((p) => desired.includes(p)).length;
      return cover(b) * b.confidence - cover(a) * a.confidence;
    });
}

// 좌석 존 추천 — DB 존(제보·추정)이 있으면 사용, 없으면 포맷 휴리스틱 폴백.
// 잔여석 미수집 전제라 항상 '추정' 라벨 (docs/05 §4.4)
export function suggestSeatZone(
  format: FormatId,
  spec: AuditoriumSpec | null,
  request: Pick<RecommendationRequest, 'subtitleReadability' | 'neckComfort' | 'motionSickness'>,
  zones: SeatZone[] = [],
): SeatZoneSuggestion {
  const desired = desiredPurposes(format, request);
  const matched = matchZones(zones, desired);
  if (matched.length) {
    const best = matched[0];
    const zone = [best.rowRange, best.colRange].filter(Boolean).join(' ') || '중앙';
    const rationale = [
      best.rationale ?? '목적별 구역 제보',
      `출처: ${best.sourceName ?? '출처 없음'} (${best.observedAt.slice(0, 10)})`,
    ];
    const uncovered = desired.filter((p) => !matched.some((z) => z.purposes.includes(p)));
    if (uncovered.length) rationale.push(`미확인 목적: ${uncovered.join(', ')}`);
    return { zone, rationale, label: '추정' };
  }
  return heuristicSuggestion(format, spec, request);
}

function heuristicSuggestion(
  format: FormatId,
  spec: AuditoriumSpec | null,
  request: Pick<RecommendationRequest, 'subtitleReadability' | 'neckComfort' | 'motionSickness'>,
): SeatZoneSuggestion {
  const rationale: string[] = ['이 관의 좌석 존 제보 없음 — 포맷 기준 일반 권장'];
  let zone: string;

  switch (format) {
    case 'imax':
      zone = '중앙 (스크린 높이 2/3 시선)';
      rationale.push('IMAX는 시야를 채우는 중앙열이 몰입에 유리');
      break;
    case 'dolby_cinema':
      zone = '중앙~중앙 후방';
      rationale.push('애트모스 스피커 배치상 중앙 후방이 균형적');
      break;
    case '4dx':
      zone = '중앙';
      rationale.push('모션 강도가 균일한 중앙 구역');
      break;
    case 'superplex':
      zone = '후방 중앙';
      rationale.push('초대형 스크린은 후방에서 전체 시야 확보');
      break;
    default:
      zone = '중앙';
      rationale.push('일반관 표준 명당 구역');
  }

  const isHugeScreen = (spec?.screen?.widthM ?? 0) >= 30;
  if (request.neckComfort) {
    zone = '후방 중앙';
    rationale.push('목 부담 최소화를 위해 후방 권장');
  }
  if (request.subtitleReadability) {
    if (isHugeScreen) {
      zone = '후방 중앙';
      rationale.push(`초대형 스크린(폭 ${spec?.screen?.widthM}m) — 자막 왕복 시선을 줄이려면 후방 권장`);
    } else if (!request.neckComfort) {
      zone = '중앙 후방';
      rationale.push('자막 가독을 위해 중앙 후방 권장');
    }
  }

  return { zone, rationale, label: '추정' };
}
