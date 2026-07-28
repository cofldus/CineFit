import { describe, expect, it } from 'vitest';
import { classifyBookingLinkCheck, isOfficialBookingDomain } from '../../src/domain/bookingLink/checker';

const NOW = new Date('2026-07-28T00:00:00+09:00');
const FUTURE_SHOWTIME = '2026-07-29T19:00:00+09:00';
const PAST_SHOWTIME = '2026-07-01T19:00:00+09:00';

function ctx(overrides: Partial<Parameters<typeof classifyBookingLinkCheck>[0]> = {}) {
  return {
    requestedUrl: 'https://ticket.cgv.co.kr/some-show',
    chain: 'CGV',
    showtimeStartsAt: FUTURE_SHOWTIME,
    now: NOW,
    fetchError: false,
    httpStatus: 200,
    redirected: false,
    finalUrl: null,
    ...overrides,
  };
}

describe('공식 예매 도메인 판별', () => {
  it('등록된 체인의 공식 도메인이면 참이다', () => {
    expect(isOfficialBookingDomain('CGV', 'https://ticket.cgv.co.kr/x')).toBe(true);
    expect(isOfficialBookingDomain('메가박스', 'https://megabox.co.kr/x')).toBe(true);
    expect(isOfficialBookingDomain('롯데시네마', 'https://www.lottecinema.co.kr/x')).toBe(true);
  });

  it('등록되지 않은 도메인이거나 URL이 아니면 거짓이다', () => {
    expect(isOfficialBookingDomain('CGV', 'https://not-cgv.example.com/x')).toBe(false);
    expect(isOfficialBookingDomain('CGV', 'not-a-url')).toBe(false);
    expect(isOfficialBookingDomain('미등록체인', 'https://cgv.co.kr/x')).toBe(false);
  });
});

describe('예매 링크 상태 분류', () => {
  it('요청 실패면 unknown이다', () => {
    expect(classifyBookingLinkCheck(ctx({ fetchError: true, httpStatus: null }))).toBe('unknown');
  });

  it('공식 도메인이 아니면 unknown이다(차단이 아니라 판단 보류)', () => {
    expect(classifyBookingLinkCheck(ctx({ requestedUrl: 'https://example.com/x' }))).toBe('unknown');
  });

  it('404/410은 not_found다', () => {
    expect(classifyBookingLinkCheck(ctx({ httpStatus: 404 }))).toBe('not_found');
    expect(classifyBookingLinkCheck(ctx({ httpStatus: 410 }))).toBe('not_found');
  });

  it('403/429/503은 blocked다', () => {
    expect(classifyBookingLinkCheck(ctx({ httpStatus: 403 }))).toBe('blocked');
    expect(classifyBookingLinkCheck(ctx({ httpStatus: 429 }))).toBe('blocked');
    expect(classifyBookingLinkCheck(ctx({ httpStatus: 503 }))).toBe('blocked');
  });

  it('상영이 이미 끝났으면 200이어도 expired다', () => {
    expect(classifyBookingLinkCheck(ctx({ showtimeStartsAt: PAST_SHOWTIME }))).toBe('expired');
  });

  it('리다이렉트되었지만 여전히 공식 도메인이면 redirected다', () => {
    expect(
      classifyBookingLinkCheck(ctx({ redirected: true, finalUrl: 'https://ticket.cgv.co.kr/final' })),
    ).toBe('redirected');
  });

  it('리다이렉트된 곳이 공식 도메인 밖이면 blocked로 의심한다', () => {
    expect(
      classifyBookingLinkCheck(ctx({ redirected: true, finalUrl: 'https://phishing.example.com/x' })),
    ).toBe('blocked');
  });

  it('그 외 200이고 리다이렉트 없으면 valid다', () => {
    expect(classifyBookingLinkCheck(ctx())).toBe('valid');
  });
});
