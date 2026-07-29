import { NextResponse } from 'next/server';
import { createShowtime, listShowtimes } from '../../../../src/data/adminShowtimeService';
import { DbNotSeededError } from '../../../../src/data/db';
import { isAdminRequest } from '../../../../src/lib/adminAuth';
import { parseAdminShowtimeInput } from '../../../../src/lib/adminValidation';
import { logger } from '../../../../src/lib/logger';

const unauthorized = () =>
  NextResponse.json({ error: '관리자 인증이 필요합니다.' }, { status: 401 });

export async function GET(req: Request) {
  if (!isAdminRequest(req)) return unauthorized();
  const url = new URL(req.url);
  const q = (k: string) => url.searchParams.get(k) ?? undefined;
  try {
    const rows = await listShowtimes({
      date: q('date'),
      movieId: q('movieId') ? Number(q('movieId')) : undefined,
      auditoriumId: q('auditoriumId') ? Number(q('auditoriumId')) : undefined,
      format: q('format'),
      status: q('status'),
      synthetic: q('synthetic') as 'synthetic' | 'verified' | undefined,
    });
    return NextResponse.json({ showtimes: rows });
  } catch (e) {
    if (e instanceof DbNotSeededError) return NextResponse.json({ error: e.message }, { status: 503 });
    logger.error('admin_showtimes_list_failed', e);
    return NextResponse.json({ error: '회차 목록 조회 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!isAdminRequest(req)) return unauthorized();
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '요청 본문이 올바른 JSON이 아닙니다.' }, { status: 400 });
  }
  const { duplicateOf, ...rest } = (body ?? {}) as Record<string, unknown>;
  const parsed = parseAdminShowtimeInput(rest);
  if (!parsed.ok) {
    return NextResponse.json({ error: '입력값을 확인해 주세요.', details: parsed.errors }, { status: 400 });
  }
  try {
    const result = await createShowtime(parsed.input, {
      duplicateOf: typeof duplicateOf === 'number' ? duplicateOf : undefined,
    });
    if (!result.ok) {
      return NextResponse.json(
        { error: '저장할 수 없습니다.', details: result.errors, needsMismatchNote: result.needsMismatchNote },
        { status: 422 },
      );
    }
    return NextResponse.json({ ok: true, id: result.id, warnings: result.warnings }, { status: 201 });
  } catch (e) {
    if (e instanceof DbNotSeededError) return NextResponse.json({ error: e.message }, { status: 503 });
    logger.error('admin_showtime_create_failed', e);
    return NextResponse.json({ error: '회차 저장 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
