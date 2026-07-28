// 예매 링크 검증(섹션 12) — 실제 네트워크 요청은 scripts/maintenance/validateBookingLinks.ts가
// 하고, 여기는 그 결과를 상태로 분류하는 순수 로직만 담는다(테스트하기 쉽게 분리).

// 실제로 통용되는 체인별 공식 예매 도메인만 등록한다 — 확인 안 된 도메인을 추정으로 넣지 않는다.
export const OFFICIAL_BOOKING_DOMAINS: Record<string, string[]> = {
  CGV: ['cgv.co.kr'],
  메가박스: ['megabox.co.kr'],
  롯데시네마: ['lottecinema.co.kr'],
};

export function isOfficialBookingDomain(chain: string, url: string): boolean {
  let hostname: string;
  try {
    hostname = new URL(url).hostname.toLowerCase();
  } catch {
    return false;
  }
  const allowed = OFFICIAL_BOOKING_DOMAINS[chain] ?? [];
  return allowed.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
}

export const BOOKING_LINK_STATUSES = ['valid', 'redirected', 'expired', 'not_found', 'blocked', 'unknown'] as const;
export type BookingLinkStatus = (typeof BOOKING_LINK_STATUSES)[number];

export const BOOKING_LINK_STATUS_LABELS: Record<BookingLinkStatus, string> = {
  valid: '정상',
  redirected: '리다이렉트됨',
  expired: '만료(상영 종료)',
  not_found: '찾을 수 없음',
  blocked: '접근 차단',
  unknown: '판단 불가',
};

export interface BookingLinkCheckContext {
  requestedUrl: string;
  chain: string;
  showtimeStartsAt: string;
  now: Date;
  fetchError: boolean;
  httpStatus: number | null;
  redirected: boolean;
  finalUrl: string | null;
}

/** HTTP 응답과 상영 시각을 함께 보고 상태를 분류한다 — 페이지 본문 스크래핑 없이 상태 코드·
 * 리다이렉트·상영 종료 여부만으로 판단한다(좌석 가용성 등은 절대 확인하지 않는다). */
export function classifyBookingLinkCheck(ctx: BookingLinkCheckContext): BookingLinkStatus {
  if (ctx.fetchError || ctx.httpStatus === null) return 'unknown';
  if (!isOfficialBookingDomain(ctx.chain, ctx.requestedUrl)) return 'unknown';

  if (ctx.httpStatus === 404 || ctx.httpStatus === 410) return 'not_found';
  if (ctx.httpStatus === 403 || ctx.httpStatus === 429 || ctx.httpStatus === 503) return 'blocked';
  if (ctx.httpStatus >= 400) return 'unknown';

  const showtimeEnded = new Date(ctx.showtimeStartsAt).getTime() < ctx.now.getTime();
  if (showtimeEnded) return 'expired';

  if (ctx.redirected) {
    if (ctx.finalUrl && !isOfficialBookingDomain(ctx.chain, ctx.finalUrl)) return 'blocked';
    return 'redirected';
  }
  return 'valid';
}
