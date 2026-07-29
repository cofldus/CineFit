import { NextResponse } from 'next/server';
import { privacyRequestService } from '../../../../src/data/privacyRequestService';
import { getAppClock } from '../../../../src/lib/clock';
import { parseEmailDeletionRequest } from '../../../../src/lib/privacyRequestValidation';
import { anonymousSessionHash } from '../../../../src/lib/sessionHash';

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '요청 본문이 올바른 JSON이 아닙니다.' }, { status: 400 });
  }
  const parsed = parseEmailDeletionRequest(body);
  if (!parsed.ok) return NextResponse.json({ error: '입력값을 확인해 주세요.', details: parsed.errors }, { status: 400 });
  if (parsed.input.website) return NextResponse.json({ error: '입력값을 확인해 주세요.' }, { status: 400 });

  const now = getAppClock().now();
  const result = await privacyRequestService.submitEmailRequest({
    contactEmail: parsed.input.contactEmail,
    message: parsed.input.message,
    sessionHash: anonymousSessionHash(req, now),
    now,
  });
  if (!result.ok) {
    return NextResponse.json({ error: '요청이 너무 잦습니다. 잠시 후 다시 시도해 주세요.' }, { status: 429 });
  }
  return NextResponse.json({ ok: true, id: result.id }, { status: 201 });
}
