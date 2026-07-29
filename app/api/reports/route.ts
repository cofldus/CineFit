import { NextResponse } from 'next/server';
import { reportService } from '../../../src/data/reportService';
import { getAppClock } from '../../../src/lib/clock';
import { logger } from '../../../src/lib/logger';
import { parsePublicReport } from '../../../src/lib/reportValidation';
import { anonymousSessionHash } from '../../../src/lib/sessionHash';

const MAX_BODY_BYTES = 20_000;

export async function POST(req: Request) {
  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: '요청 본문이 너무 큽니다.' }, { status: 413 });
  }
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: '요청 본문이 올바른 JSON이 아닙니다.' }, { status: 400 });
  }

  const parsed = parsePublicReport(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: '입력값을 확인해 주세요.', details: parsed.errors }, { status: 400 });
  }

  try {
    const now = getAppClock().now();
    const result = await reportService.create(parsed.input, {
      sessionHash: anonymousSessionHash(req, now),
      now,
    });
    if (!result.ok) {
      return NextResponse.json(
        { error: result.message },
        { status: result.code === 'rate_limited' ? 429 : 404 },
      );
    }
    return NextResponse.json(
      { ok: true, id: result.id, duplicateSuspect: result.duplicateSuspect },
      { status: 201 },
    );
  } catch (e) {
    logger.error('report_create_failed', e); // 본문·이메일은 로그에 남기지 않는다 — logger.error는 message/stack만 남긴다
    return NextResponse.json({ error: '제보 접수 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.' }, { status: 500 });
  }
}
