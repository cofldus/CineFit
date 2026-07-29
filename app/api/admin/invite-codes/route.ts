import { NextResponse } from 'next/server';
import { createInviteCode, listInviteCodes } from '../../../../src/data/inviteCodeService';
import { isAdminRequest } from '../../../../src/lib/adminAuth';
import { getAppClock } from '../../../../src/lib/clock';

const unauthorized = () => NextResponse.json({ error: '관리자 인증이 필요합니다.' }, { status: 401 });

export async function GET(req: Request) {
  if (!isAdminRequest(req)) return unauthorized();
  return NextResponse.json({ codes: await listInviteCodes() });
}

export async function POST(req: Request) {
  if (!isAdminRequest(req)) return unauthorized();
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: '요청 본문이 올바른 JSON이 아닙니다.' }, { status: 400 });
  }

  const maxUses = body.maxUses === '' || body.maxUses == null ? null : Number(body.maxUses);
  if (maxUses !== null && (!Number.isInteger(maxUses) || maxUses < 1)) {
    return NextResponse.json({ error: '사용 가능 횟수는 1 이상의 정수이거나 비워둬야 합니다(무제한).' }, { status: 400 });
  }
  const expiresAt = typeof body.expiresAt === 'string' && body.expiresAt.trim() ? body.expiresAt.trim() : null;

  const code = await createInviteCode({
    code: typeof body.code === 'string' && body.code.trim() ? body.code : undefined,
    description: typeof body.description === 'string' && body.description.trim() ? body.description : null,
    maxUses,
    expiresAt,
    actor: 'admin',
    now: () => getAppClock().now(),
  });
  return NextResponse.json({ ok: true, code });
}
