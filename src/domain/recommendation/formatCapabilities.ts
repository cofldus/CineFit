// R21 §5 — 포맷 capability registry. "이 포맷이 무엇을 할 수 있는가"를 이름 비교가 아니라
// 속성으로 판단한다. 새 포맷(MX4D 등)이 추가되면 여기 한 줄이면 회피·필터 로직이 전부
// 자동으로 따라온다. 등록되지 않은 포맷은 모든 capability를 보수적으로 false로 본다.
import type { FormatId } from './types';

export interface FormatCapabilities {
  /** 모션 시트(진동·움직임) 포맷 — '움직이는 좌석 피하기' 하드 제외 기준 */
  motionSeat: boolean;
  /** IMAX류 확장 화면비 — '큰 화면 멀미' soft 감점 기준 */
  extendedAspect: boolean;
  /** 프리미엄 상영(일반관 대비 가격·설비 상위) 여부 */
  premium: boolean;
}

const DEFAULT_CAPS: FormatCapabilities = { motionSeat: false, extendedAspect: false, premium: false };

// FormatId 전체를 강제(Record<FormatId, …>)해 새 포맷이 타입에 추가되면 여기 등록을
// 잊을 수 없게 한다. 데이터에 아직 없는 MX4D도 미리 등록해 확장 경로를 검증한다.
export const FORMAT_CAPABILITIES: Record<FormatId, FormatCapabilities> = {
  standard: { motionSeat: false, extendedAspect: false, premium: false },
  superplex: { motionSeat: false, extendedAspect: false, premium: false },
  imax: { motionSeat: false, extendedAspect: true, premium: true },
  dolby_cinema: { motionSeat: false, extendedAspect: false, premium: true },
  '4dx': { motionSeat: true, extendedAspect: false, premium: true },
  mx4d: { motionSeat: true, extendedAspect: false, premium: true },
};

export function capabilitiesOf(format: string): FormatCapabilities {
  return FORMAT_CAPABILITIES[format as FormatId] ?? DEFAULT_CAPS;
}

export function hasMotionSeat(format: string): boolean {
  return capabilitiesOf(format).motionSeat;
}

export function hasExtendedAspect(format: string): boolean {
  return capabilitiesOf(format).extendedAspect;
}
