// 관측(observation) 기록의 내부 필드 키·값을 사용자 언어로 변환(R15 §7) —
// projector.imax_grade, gt_dual_laser 같은 내부 표기를 일반 화면에 그대로 노출하지 않는다.
// 매핑에 없는 값은 지어내지 않고 원문을 그대로 보여준다(빈 값 > 틀린 값 원칙).

const FIELD_LABELS: Record<string, string> = {
  'projector.imax_grade': '영사 방식(IMAX 등급)',
  'projector.light_source': '영사 광원',
  'projector.resolution': '영사 해상도',
  'projector.dual': '듀얼 영사',
  'projector.dolby_vision': '돌비 비전',
  'screen.aspect': '스크린 비율',
  'screen.width_m': '스크린 폭',
  'screen.height_m': '스크린 높이',
  'sound.format': '사운드 포맷',
  'seat.count': '좌석 수',
  masking: '마스킹',
  supported_ar: '표시 가능한 최대 확장비',
};

const GROUP_LABELS: Record<string, string> = {
  projector: '영사기',
  screen: '스크린',
  sound: '사운드',
  seat: '좌석',
  seats: '좌석',
};

const VALUE_LABELS: Record<string, string> = {
  gt_dual_laser: 'IMAX GT 듀얼 레이저',
  gt: 'IMAX GT',
  cola: 'IMAX 코멀셜 레이저',
  xenon: '제논',
  laser: '레이저',
  dual_laser: '듀얼 레이저',
  dolby_atmos: '돌비 애트모스',
  atmos: '돌비 애트모스',
  imax_12ch: 'IMAX 12채널 사운드',
  imax_6ch: 'IMAX 6채널 사운드',
  '7.1': '7.1 채널',
  '5.1': '5.1 채널',
  side: '좌우 마스킹',
  top: '상하 마스킹',
  both: '상하좌우 마스킹',
  none: '마스킹 없음',
  true: '있음',
  false: '없음',
};

export function humanizeObservationField(field: string): string {
  if (FIELD_LABELS[field]) return FIELD_LABELS[field];
  const group = field.split('.')[0];
  return GROUP_LABELS[group] ? `${GROUP_LABELS[group]} 사양` : '상영관 사양';
}

export function humanizeObservationValue(value: unknown): string {
  const raw = String(value);
  return VALUE_LABELS[raw] ?? raw;
}
