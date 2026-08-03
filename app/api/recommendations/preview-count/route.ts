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
  // 후보 변화 내역(R15 §5) — 제외 사유 문구에서 이동/가격 단계를 집계해 "전체 → 이동시간
  // 적용 → 예산 적용 → 최종" 퍼널을 만든다(엔진의 실제 제외 결과 그대로, 새 계산 없음).
  const excluded = res.result.excluded;
  const travelCut = excluded.filter((e) => /최대 이동 시간 .*초과/.test(e.reason)).length;
  const priceCut = excluded.filter((e) => /상한 .*초과/.test(e.reason)).length;
  const total = res.result.totalCandidates;
  return NextResponse.json({
    ok: true,
    candidates: res.result.scored.length,
    total,
    funnel: {
      total,
      afterTravel: total - travelCut,
      afterPrice: total - travelCut - priceCut,
      final: res.result.scored.length,
    },
  });
}
