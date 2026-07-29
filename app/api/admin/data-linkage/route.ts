import { NextResponse } from 'next/server';
import { approveCandidate, rejectCandidate, unlinkMovie } from '../../../../src/data/identifierLinkageService';
import { isAdminRequest } from '../../../../src/lib/adminAuth';
import { getAppClock } from '../../../../src/lib/clock';

const unauthorized = () => NextResponse.json({ error: '관리자 인증이 필요합니다.' }, { status: 401 });

export async function POST(req: Request) {
  if (!isAdminRequest(req)) return unauthorized();
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: '요청 본문이 올바른 JSON이 아닙니다.' }, { status: 400 });
  }

  const now = getAppClock().now();
  const actor = 'admin';
  const opts = { actor, now: () => now };

  if (body.action === 'approve' || body.action === 'reject') {
    const candidateId = Number(body.candidateId);
    if (!Number.isInteger(candidateId)) {
      return NextResponse.json({ error: 'candidateId가 필요합니다.' }, { status: 400 });
    }
    const result = await (body.action === 'approve' ? approveCandidate : rejectCandidate)(candidateId, opts);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 404 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'unlink') {
    const movieId = Number(body.movieId);
    if (!Number.isInteger(movieId)) {
      return NextResponse.json({ error: 'movieId가 필요합니다.' }, { status: 400 });
    }
    const result = await unlinkMovie(movieId, opts);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 404 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "action은 'approve'|'reject'|'unlink' 중 하나여야 합니다." }, { status: 400 });
}
