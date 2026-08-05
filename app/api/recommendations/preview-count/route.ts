// 조건 입력 중 실시간 "현재 조건에 맞는 후보 N개" 조회 — 결과 페이지와 완전히 같은
// 파서·추천 서비스를 preview 모드로 재사용한다(별도 카운트 로직을 두면 실제 결과와
// 어긋날 수 있어 일부러 같은 경로를 탄다). preview 모드는 run 기록을 남기지 않는다.
import { NextResponse, type NextRequest } from 'next/server';
import { getRecommendations } from '../../../../src/data/recommendationService';
import {
  deriveCandidateDataState,
  isStale,
  latestCheckedAt,
} from '../../../../src/lib/dataFreshness';
import { getAppClock } from '../../../../src/lib/clock';
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
  // 후보 변화 내역(R15 §5) — 제외 사유 문구에서 시간대/이동 단계를 집계해 "전체 →
  // 희망 시간대 → 이동시간 → 최종" 퍼널을 만든다(엔진의 실제 제외 결과 그대로,
  // 새 계산 없음). R20: 가격은 soft preference라 퍼널 단계가 아니다.
  const excluded = res.result.excluded;
  const timeCut = excluded.filter((e) => /희망 시간대.*밖/.test(e.reason)).length;
  const travelCut = excluded.filter((e) => /최대 이동 시간 .*초과/.test(e.reason)).length;
  // R21.1: 퍼널·상태의 기준은 verified-only 게이트 통과분 — 게이트 제외(합성·미검증·만료)는
  // 사용자 퍼널 숫자에 섞지 않는다.
  const total = res.result.eligibleCandidates ?? res.result.totalCandidates;

  // R20 §1: 후보 수를 "정확한 값처럼" 보여도 되는 상태인지 명시한다 — 관리자 확인 회차가
  // 없으면(합성·미등록) 화면은 개수 대신 '회차 데이터 연결 전' 안내를 보여야 한다.
  const dataState = deriveCandidateDataState({
    total,
    usedSynthetic: res.result.dataMode?.usedSynthetic ?? false,
  });
  const checkedAt = latestCheckedAt(res.result.scored.map((s) => s.candidate));
  const stale = dataState === 'verified' && isStale(checkedAt, getAppClock().now());

  return NextResponse.json({
    ok: true,
    candidates: res.result.scored.length,
    total,
    dataState,
    checkedAt,
    stale,
    funnel: {
      total,
      afterTime: total - timeCut,
      afterTravel: total - timeCut - travelCut,
      final: res.result.scored.length,
    },
  });
}
