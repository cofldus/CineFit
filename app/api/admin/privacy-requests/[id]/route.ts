import { NextResponse } from 'next/server';
import { privacyRequestService } from '../../../../../src/data/privacyRequestService';
import { isAdminRequest } from '../../../../../src/lib/adminAuth';
import { getAppClock } from '../../../../../src/lib/clock';

const unauthorized = () => NextResponse.json({ error: '관리자 인증이 필요합니다.' }, { status: 401 });

type Params = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Params) {
  if (!isAdminRequest(req)) return unauthorized();
  const id = Number((await params).id);
  const request = await privacyRequestService.get(id);
  if (!request) return NextResponse.json({ error: '요청을 찾을 수 없습니다.' }, { status: 404 });
  const preview = await privacyRequestService.previewImpact(id);
  return NextResponse.json({ request, preview });
}

export async function PATCH(req: Request, { params }: Params) {
  if (!isAdminRequest(req)) return unauthorized();
  const id = Number((await params).id);
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: '요청 본문이 올바른 JSON이 아닙니다.' }, { status: 400 });
  }

  const action = body.action;
  const now = getAppClock().now();
  const actor = 'admin';

  if (action === 'complete') {
    const result = await privacyRequestService.complete({ id, actor, now });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.error === 'not_found' ? 404 : 422 });
    return NextResponse.json({ ok: true, affectedSummary: result.affectedSummary });
  }
  if (action === 'reject') {
    const note = typeof body.note === 'string' && body.note.trim() ? body.note.trim() : undefined;
    const result = await privacyRequestService.reject({ id, actor, now, note });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.error === 'not_found' ? 404 : 422 });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: 'action은 complete 또는 reject여야 합니다.' }, { status: 400 });
}
