import { NextResponse } from 'next/server';
import { featureFlagRepository } from '../../../../src/data/featureFlagRepository';
import { isAdminRequest } from '../../../../src/lib/adminAuth';
import { getAppClock } from '../../../../src/lib/clock';

const unauthorized = () => NextResponse.json({ error: '관리자 인증이 필요합니다.' }, { status: 401 });

const KEY_PATTERN = /^[a-z][a-z0-9_]{1,63}$/;

export async function GET(req: Request) {
  if (!isAdminRequest(req)) return unauthorized();
  return NextResponse.json({ flags: await featureFlagRepository.list() });
}

export async function POST(req: Request) {
  if (!isAdminRequest(req)) return unauthorized();
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: '요청 본문이 올바른 JSON이 아닙니다.' }, { status: 400 });
  }

  const key = typeof body.key === 'string' ? body.key.trim() : '';
  if (!KEY_PATTERN.test(key)) {
    return NextResponse.json(
      { error: '키는 소문자·숫자·밑줄만 사용하고 소문자로 시작해야 합니다 (예: onboarding).' },
      { status: 400 },
    );
  }
  if (typeof body.enabled !== 'boolean') {
    return NextResponse.json({ error: 'enabled는 boolean이어야 합니다.' }, { status: 400 });
  }
  const description = typeof body.description === 'string' ? body.description : null;

  const flag = await featureFlagRepository.set({
    key,
    enabled: body.enabled,
    description,
    actor: 'admin',
    now: getAppClock().now(),
  });
  return NextResponse.json({ ok: true, flag });
}
