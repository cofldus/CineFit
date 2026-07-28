import { NextResponse } from 'next/server';
import { reportService } from '../../../../../src/data/reportService';
import { REPORT_STATUS_LABELS } from '../../../../../src/lib/reportValidation';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: '잘못된 제보 번호입니다.' }, { status: 400 });
  }
  const status = await reportService.getPublicStatus(id);
  if (!status) return NextResponse.json({ error: '제보를 찾을 수 없습니다.' }, { status: 404 });
  return NextResponse.json({
    ...status,
    statusLabel: REPORT_STATUS_LABELS[status.status] ?? status.status,
  });
}
