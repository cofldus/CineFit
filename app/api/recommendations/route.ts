import { NextResponse } from 'next/server';
import { DbNotSeededError } from '../../../src/data/db';
import { getRecommendations } from '../../../src/data/recommendationService';
import { parseRecommendationInput } from '../../../src/lib/validation';

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '요청 본문이 올바른 JSON이 아닙니다.' }, { status: 400 });
  }

  const parsed = parseRecommendationInput(body);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: '입력값을 확인해 주세요.', details: parsed.errors },
      { status: 400 },
    );
  }

  try {
    const res = getRecommendations(parsed.input);
    if (!res.ok) {
      return NextResponse.json({ error: '해당 영화를 찾을 수 없습니다.' }, { status: 404 });
    }
    return NextResponse.json(res.result);
  } catch (e) {
    if (e instanceof DbNotSeededError) {
      return NextResponse.json(
        { error: '데이터베이스가 준비되지 않았습니다. `npm run db:seed` 실행 후 다시 시도해 주세요.' },
        { status: 503 },
      );
    }
    console.error('추천 계산 실패:', e); // 내부 오류는 로그로만 — 화면 노출 금지
    return NextResponse.json(
      { error: '추천 계산 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.' },
      { status: 500 },
    );
  }
}
