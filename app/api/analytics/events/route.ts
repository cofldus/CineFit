import { NextResponse } from 'next/server';
import packageJson from '../../../../package.json';
import { parseAnalyticsEvent } from '../../../../src/analytics/analyticsEvents';
import { serverAnalytics } from '../../../../src/analytics/serverAnalytics';
import { issueAnalyticsSessionCookie, resolveAnalyticsSessionId } from '../../../../src/lib/analyticsSession';
import { getAppClock } from '../../../../src/lib/clock';
import { logger } from '../../../../src/lib/logger';

const APP_VERSION = packageJson.version;

/** 익명 분석 이벤트 수집 — 실패해도 사용자 흐름을 막지 않도록 클라이언트가 fire-and-forget으로 호출한다. */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '요청 본문이 올바른 JSON이 아닙니다.' }, { status: 400 });
  }
  const { event, properties } = (body ?? {}) as Record<string, unknown>;
  const parsed = parseAnalyticsEvent(event, properties);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { id: sessionId, isNew } = resolveAnalyticsSessionId(req);
  try {
    await serverAnalytics.recordEvent(parsed.eventName, parsed.properties, {
      sessionId,
      appVersion: APP_VERSION,
      now: getAppClock().now(),
    });
    const res = new NextResponse(null, { status: 204 });
    if (isNew) issueAnalyticsSessionCookie(res, sessionId);
    return res;
  } catch (e) {
    // 클라이언트(analyticsClient.ts)는 이 응답을 확인하지 않는 fire-and-forget 호출이라
    // 여기서 500을 반환해도 사용자 흐름은 막히지 않는다 — 로그·테스트를 위해 정확히 응답한다.
    logger.error('analytics_event_record_failed', e, { eventName: parsed.eventName });
    const res = NextResponse.json({ error: '이벤트 저장 중 오류가 발생했습니다.' }, { status: 500 });
    if (isNew) issueAnalyticsSessionCookie(res, sessionId);
    return res;
  }
}
