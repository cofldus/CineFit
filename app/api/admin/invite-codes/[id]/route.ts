import { NextResponse } from 'next/server';
import { setInviteCodeActive } from '../../../../../src/data/inviteCodeService';
import { isAdminRequest } from '../../../../../src/lib/adminAuth';

const unauthorized = () => NextResponse.json({ error: '관리자 인증이 필요합니다.' }, { status: 401 });

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdminRequest(req)) return unauthorized();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: '잘못된 id입니다.' }, { status: 400 });

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: '요청 본문이 올바른 JSON이 아닙니다.' }, { status: 400 });
  }
  if (typeof body.active !== 'boolean') {
    return NextResponse.json({ error: 'active(boolean)가 필요합니다.' }, { status: 400 });
  }

  const result = await setInviteCodeActive(id, body.active);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 404 });
  return NextResponse.json({ ok: true });
}
