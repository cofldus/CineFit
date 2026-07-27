import type { AuditoriumSpec, FormatId, RecommendationRequest, SeatZoneSuggestion } from './types';

// 좌석 존 데이터 미수집 → 포맷·설비·선호 기반 추정만 제공 (문서 05 §4.4 — '추정' 라벨 필수)
export function suggestSeatZone(
  format: FormatId,
  spec: AuditoriumSpec | null,
  request: Pick<RecommendationRequest, 'subtitleReadability' | 'neckComfort'>,
): SeatZoneSuggestion {
  const rationale: string[] = [];
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
