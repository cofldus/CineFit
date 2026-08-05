// R21 — 관리자 회차 CSV import API. commit=false면 preview(검증만), true면 유효 행 등록.
// 수동 폼과 같은 검증·이력 경로(adminShowtimeService)를 재사용한다.
import { NextResponse, type NextRequest } from 'next/server';
import { importShowtimeCsv } from '../../../../../src/data/showtimeImportService';
import { isAdminRequest } from '../../../../../src/lib/adminAuth';
import { DbNotSeededError } from '../../../../../src/data/client/index';
import { logger } from '../../../../../src/lib/logger';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: '관리자 인증이 필요합니다.' }, { status: 401 });
  }
  let body: { csv?: unknown; commit?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '잘못된 JSON 본문입니다.' }, { status: 400 });
  }
  if (typeof body.csv !== 'string' || body.csv.trim() === '') {
    return NextResponse.json({ error: 'csv 텍스트가 필요합니다.' }, { status: 400 });
  }
  if (body.csv.length > 512_000) {
    return NextResponse.json({ error: 'CSV가 너무 큽니다(500KB 초과).' }, { status: 400 });
  }
  try {
    const result = await importShowtimeCsv(body.csv, { commit: body.commit === true, actor: 'admin(csv)' });
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (e) {
    if (e instanceof DbNotSeededError) {
      return NextResponse.json({ error: 'DB가 준비되지 않았습니다.' }, { status: 503 });
    }
    logger.error('admin_showtime_import_failed', e);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
