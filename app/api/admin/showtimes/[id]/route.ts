import { NextResponse } from 'next/server';
import {
  getShowtime,
  listChanges,
  setShowtimeStatus,
  updateShowtime,
} from '../../../../../src/data/adminShowtimeService';
import { isAdminRequest } from '../../../../../src/lib/adminAuth';
import { parseAdminShowtimeInput } from '../../../../../src/lib/adminValidation';
import { logger } from '../../../../../src/lib/logger';

const unauthorized = () =>
  NextResponse.json({ error: '관리자 인증이 필요합니다.' }, { status: 401 });

type Params = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Params) {
  if (!isAdminRequest(req)) return unauthorized();
  const id = Number((await params).id);
  const showtime = await getShowtime(id);
  if (!showtime) return NextResponse.json({ error: '회차를 찾을 수 없습니다.' }, { status: 404 });
  return NextResponse.json({ showtime, changes: await listChanges(id) });
}

export async function PATCH(req: Request, { params }: Params) {
  if (!isAdminRequest(req)) return unauthorized();
  const id = Number((await params).id);
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: '요청 본문이 올바른 JSON이 아닙니다.' }, { status: 400 });
  }

  try {
    // 상태만 바꾸는 요청 (비활성화/재활성화)
    if (typeof body.status === 'string' && Object.keys(body).length === 1) {
      if (body.status !== 'active' && body.status !== 'disabled') {
        return NextResponse.json({ error: 'status는 active/disabled 중 하나입니다.' }, { status: 400 });
      }
      const result = await setShowtimeStatus(id, body.status);
      if (!result.ok) return NextResponse.json({ error: result.errors[0] }, { status: 404 });
      return NextResponse.json({ ok: true, id });
    }

    const parsed = parseAdminShowtimeInput(body);
    if (!parsed.ok) {
      return NextResponse.json({ error: '입력값을 확인해 주세요.', details: parsed.errors }, { status: 400 });
    }
    const result = await updateShowtime(id, parsed.input);
    if (!result.ok) {
      const notFound = result.errors[0]?.includes('존재하지 않는 회차');
      return NextResponse.json(
        { error: '저장할 수 없습니다.', details: result.errors, needsMismatchNote: result.needsMismatchNote },
        { status: notFound ? 404 : 422 },
      );
    }
    return NextResponse.json({ ok: true, id, warnings: result.warnings });
  } catch (e) {
    logger.error('admin_showtime_update_failed', e, { showtimeId: id });
    return NextResponse.json({ error: '회차 저장 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
