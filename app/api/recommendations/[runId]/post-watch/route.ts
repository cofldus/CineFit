import { NextResponse } from 'next/server';
import { serverAnalytics } from '../../../../../src/analytics/serverAnalytics';
import { postWatchService } from '../../../../../src/data/postWatchService';
import { issueAnalyticsSessionCookie, resolveAnalyticsSessionId } from '../../../../../src/lib/analyticsSession';
import { getAppClock } from '../../../../../src/lib/clock';
import { parsePostWatchSurvey } from '../../../../../src/lib/postWatchValidation';

type Params = { params: Promise<{ runId: string }> };

export async function POST(req: Request, { params }: Params) {
  const runId = Number((await params).runId);
  if (!Number.isInteger(runId) || runId <= 0) {
    return NextResponse.json({ error: '잘못된 추천 실행 id입니다.' }, { status: 400 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '요청 본문이 올바른 JSON이 아닙니다.' }, { status: 400 });
  }
  const parsed = parsePostWatchSurvey(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: '입력값을 확인해 주세요.', details: parsed.errors }, { status: 400 });
  }

  const { id: sessionId, isNew } = resolveAnalyticsSessionId(req);
  const now = getAppClock().now();
  await serverAnalytics.ensureSession(sessionId, undefined, now.toISOString());
  const result = await postWatchService.submit(runId, parsed.input, { sessionId, now });
  if (!result.ok) {
    const status = result.code === 'run_not_found' ? 404 : 422;
    const res = NextResponse.json({ error: result.error }, { status });
    if (isNew) issueAnalyticsSessionCookie(res, sessionId);
    return res;
  }

  const res = NextResponse.json({ ok: true, id: result.id }, { status: 201 });
  if (isNew) issueAnalyticsSessionCookie(res, sessionId);
  return res;
}
