import { createHash } from 'node:crypto';

/**
 * 익명 세션 해시 — 남용 제한 전용.
 * IP 원문을 저장하지 않으며, 일 단위 salt 회전으로 장기 추적을 불가능하게 한다 (비가역).
 */
export function anonymousSessionHash(req: Request, now: Date): string {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'local';
  const ua = req.headers.get('user-agent') ?? '';
  const daySalt = now.toISOString().slice(0, 10);
  const secret = process.env.CINEFIT_HASH_SECRET ?? 'cinefit-report-hash-v1';
  return createHash('sha256').update(`${secret}|${daySalt}|${ip}|${ua}`).digest('hex');
}
