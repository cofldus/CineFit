// 비공개 알파 초대 쿠키 — analyticsSession.ts와 동일한 수동 헤더 파싱 방식(req/res 직접
// 다뤄 next/headers의 요청 스코프 의존 없이 테스트 가능하게 한다).
import type { NextResponse } from 'next/server';

export const ALPHA_INVITE_COOKIE = 'cinefit_invited';
const MAX_AGE_SECONDS = 90 * 24 * 60 * 60; // docs/DATA-RETENTION.md와 동일 기준

export function readInviteCookie(req: Request): boolean {
  const cookie = req.headers.get('cookie') ?? '';
  return new RegExp(`(?:^|;\\s*)${ALPHA_INVITE_COOKIE}=1(?:;|$)`).test(cookie);
}

export function issueInviteCookie(res: NextResponse): void {
  res.cookies.set(ALPHA_INVITE_COOKIE, '1', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production' && process.env.CINEFIT_INSECURE_COOKIE !== 'true',
    maxAge: MAX_AGE_SECONDS,
    path: '/',
  });
}
