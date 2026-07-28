// 분석용 익명 세션 쿠키 — req/res를 직접 다뤄 next/headers의 요청 스코프 의존 없이 테스트
// 가능하게 한다(src/lib/adminAuth.ts·app/api/admin/login/route.ts와 동일한 방식).
// IP·GPS·광고 식별자는 여기서도 절대 다루지 않는다.
import { randomUUID } from 'node:crypto';
import type { NextResponse } from 'next/server';

export const ANALYTICS_COOKIE = 'cinefit_session';
const MAX_AGE_SECONDS = 90 * 24 * 60 * 60; // 90일 — docs/DATA-RETENTION.md와 일치

export function readAnalyticsSessionId(req: Request): string | null {
  const cookie = req.headers.get('cookie') ?? '';
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${ANALYTICS_COOKIE}=([^;]+)`));
  return match?.[1] ?? null;
}

/** 새 세션 id를 res에 쿠키로 실어 보낸다 — 기존 쿠키가 있었다면 호출하지 않는다. */
export function issueAnalyticsSessionCookie(res: NextResponse, id: string): void {
  res.cookies.set(ANALYTICS_COOKIE, id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production' && process.env.CINEFIT_INSECURE_COOKIE !== 'true',
    maxAge: MAX_AGE_SECONDS,
    path: '/',
  });
}

/** 요청에서 세션 id를 얻는다(없으면 새로 발급) — 발급 여부(isNew)를 함께 반환한다. */
export function resolveAnalyticsSessionId(req: Request): { id: string; isNew: boolean } {
  const existing = readAnalyticsSessionId(req);
  return existing ? { id: existing, isNew: false } : { id: randomUUID(), isNew: true };
}
