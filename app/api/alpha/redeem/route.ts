import { NextResponse } from 'next/server';
import { serverAnalytics } from '../../../../src/analytics/serverAnalytics';
import { redeemInviteCode } from '../../../../src/data/inviteCodeService';
import { issueInviteCookie } from '../../../../src/lib/alphaAccess';
import { issueAnalyticsSessionCookie, resolveAnalyticsSessionId } from '../../../../src/lib/analyticsSession';
import { getAppClock } from '../../../../src/lib/clock';

const ERROR_MESSAGES: Record<string, string> = {
  not_found: '초대 코드를 찾을 수 없습니다.',
  inactive: '더 이상 사용할 수 없는 초대 코드입니다.',
  expired: '만료된 초대 코드입니다.',
  exhausted: '사용 가능 횟수를 모두 소진한 초대 코드입니다.',
};

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: '요청 본문이 올바른 JSON이 아닙니다.' }, { status: 400 });
  }
  const code = typeof body.code === 'string' ? body.code.trim() : '';
  if (!code) return NextResponse.json({ error: '초대 코드를 입력하세요.' }, { status: 400 });

  const now = getAppClock().now();
  const { id: sessionId, isNew } = resolveAnalyticsSessionId(req);
  await serverAnalytics.ensureSession(sessionId, undefined, now.toISOString());

  const result = await redeemInviteCode(code, { sessionId, now: () => now });
  if (!result.ok) {
    return NextResponse.json({ error: ERROR_MESSAGES[result.error] ?? '초대 코드를 확인할 수 없습니다.' }, { status: 400 });
  }

  const res = NextResponse.json({ ok: true });
  if (isNew) issueAnalyticsSessionCookie(res, sessionId);
  issueInviteCookie(res);
  return res;
}
