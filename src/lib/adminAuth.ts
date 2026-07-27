// 관리자 인증 — ADMIN_PASSWORD 환경변수 기반 단일 관리자 세션.
// 미설정 시 관리자 기능 전체 비활성(운영 무방비 노출 방지). 비밀번호·토큰은 로그 출력 금지.
import { createHmac, timingSafeEqual } from 'node:crypto';

export const ADMIN_COOKIE = 'cinefit_admin';

export function adminEnabled(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD);
}

export function createAdminToken(password: string): string {
  return createHmac('sha256', password).update('cinefit-admin-session-v1').digest('hex');
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export function verifyAdminPassword(password: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  return Boolean(expected) && safeEqual(password, expected!);
}

export function verifyAdminToken(token: string | null | undefined): boolean {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw || !token) return false;
  return safeEqual(token, createAdminToken(pw));
}

/** API 라우트용: 쿠키 또는 x-admin-token 헤더에서 토큰 확인 */
export function isAdminRequest(req: Request): boolean {
  const header = req.headers.get('x-admin-token');
  if (verifyAdminToken(header)) return true;
  const cookie = req.headers.get('cookie') ?? '';
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${ADMIN_COOKIE}=([^;]+)`));
  return verifyAdminToken(match?.[1] ?? null);
}
