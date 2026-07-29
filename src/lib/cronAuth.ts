// Vercel Cron 인증 — Vercel이 vercel.json의 crons 항목을 호출할 때 Authorization: Bearer
// <CRON_SECRET> 헤더를 자동으로 붙인다(https://vercel.com/docs/cron-jobs/manage-cron-jobs).
// 관리자 로그인 쿠키(ADMIN_PASSWORD)와는 별개의 비밀값 — cron은 브라우저 세션이 없다.
export function isCronRequest(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // 미설정이면 항상 거부 — 인증 없는 실행 금지
  const header = req.headers.get('authorization');
  return header === `Bearer ${secret}`;
}
