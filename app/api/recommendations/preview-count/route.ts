// 조건 입력 중 실시간 "현재 조건에 맞는 후보 N개" 조회 — 결과 페이지와 완전히 같은
// 파서·추천 서비스를 preview 모드로 재사용한다(별도 카운트 로직을 두면 실제 결과와
// 어긋날 수 있어 일부러 같은 경로를 탄다). preview 모드는 run 기록을 남기지 않는다.
import { NextResponse, type NextRequest } from 'next/server';
import { getRecommendations } from '../../../../src/data/recommendationService';
import { parseRecommendationInput } from '../../../../src/lib/validation';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const raw = Object.fromEntries(req.nextUrl.searchParams.entries());
  const parsed = parseRecommendationInput(raw);
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, error: 'invalid_input' }, { status: 400 });
  }
  const res = await getRecommendations(parsed.input, { preview: true });
  if (!res.ok) {
    return NextResponse.json({ ok: false, error: res.error }, { status: 404 });
  }
  return NextResponse.json({
    ok: true,
    candidates: res.result.scored.length,
    total: res.result.totalCandidates,
  });
}
