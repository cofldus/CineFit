import { NextResponse } from 'next/server';
import { ADMIN_COOKIE, adminEnabled, createAdminToken, verifyAdminPassword } from '../../../../src/lib/adminAuth';

export async function POST(req: Request) {
  if (!adminEnabled()) {
    return NextResponse.json(
      { error: '관리자 기능이 비활성화되어 있습니다 (ADMIN_PASSWORD 미설정).' },
      { status: 503 },
    );
  }
  let body: { password?: unknown };
  try {
    body = (await req.json()) as { password?: unknown };
  } catch {
    return NextResponse.json({ error: '요청 본문이 올바르지 않습니다.' }, { status: 400 });
  }
  if (typeof body.password !== 'string' || !verifyAdminPassword(body.password)) {
    return NextResponse.json({ error: '비밀번호가 올바르지 않습니다.' }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, createAdminToken(body.password), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production' && process.env.CINEFIT_INSECURE_COOKIE !== 'true',
    maxAge: 60 * 60 * 8, // 8시간 세션
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
  return res;
}
