import { NextResponse } from 'next/server';
import { serverAnalytics } from '../../../../src/analytics/serverAnalytics';
import { recordAlphaConsent } from '../../../../src/data/inviteCodeService';
import { issueAnalyticsSessionCookie, resolveAnalyticsSessionId } from '../../../../src/lib/analyticsSession';
import { getAppClock } from '../../../../src/lib/clock';

export async function POST(req: Request) {
  const now = getAppClock().now();
  const { id: sessionId, isNew } = resolveAnalyticsSessionId(req);
  await serverAnalytics.ensureSession(sessionId, undefined, now.toISOString());
  await recordAlphaConsent(sessionId, now);

  const res = NextResponse.json({ ok: true });
  if (isNew) issueAnalyticsSessionCookie(res, sessionId);
  return res;
}
