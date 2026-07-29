// 비공개 알파 게이트 — feature_flags의 'private_alpha_gate'가 켜져 있을 때만 강제한다
// (기본값은 꺼짐 — db/seed-feature-flags.mjs, docs/PRIVATE-ALPHA.md). 꺼져 있으면 기존
// 7차 마일스톤 동작 그대로 앱 전체가 열려 있다.
// Proxy(옛 middleware)는 Next.js 16부터 항상 Node.js 런타임에서 돈다 — DB 조회가 그냥 된다.
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { featureFlagRepository } from './src/data/featureFlagRepository';
import { hasAlphaConsent } from './src/data/inviteCodeService';
import { readInviteCookie } from './src/lib/alphaAccess';
import { readAnalyticsSessionId } from './src/lib/analyticsSession';

export const config = {
  matcher: ['/((?!_next|api|admin|alpha|manifest\\.webmanifest|offline|favicon\\.ico|.*\\.[a-zA-Z0-9]+$).*)'],
};

function redirectWithNext(req: NextRequest, path: string): NextResponse {
  const url = new URL(path, req.url);
  url.searchParams.set('next', req.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export async function proxy(req: NextRequest) {
  // DB 조회가 실패하면(마이그레이션 전, DB 준비 안 됨, 일시적 장애 등) 항상 열어준다 — 게이트
  // 하나가 사이트 전체를 막는 것보다 일시적으로 게이트가 무력화되는 쪽이 훨씬 안전하다.
  let gateEnabled: boolean;
  try {
    gateEnabled = await featureFlagRepository.isEnabled('private_alpha_gate');
  } catch {
    return NextResponse.next();
  }
  if (!gateEnabled) return NextResponse.next();

  if (!readInviteCookie(req)) return redirectWithNext(req, '/alpha/invite');

  const sessionId = readAnalyticsSessionId(req);
  let consented: boolean;
  try {
    consented = sessionId ? await hasAlphaConsent(sessionId) : false;
  } catch {
    return NextResponse.next();
  }
  if (!consented) return redirectWithNext(req, '/alpha/consent');

  return NextResponse.next();
}
