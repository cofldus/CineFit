import { NextResponse } from 'next/server';
import { reportPromotionService } from '../../../../../src/data/reportPromotionService';
import { reportService } from '../../../../../src/data/reportService';
import { getAppClock } from '../../../../../src/lib/clock';
import { isAdminRequest } from '../../../../../src/lib/adminAuth';
import { parseAdminReportAction } from '../../../../../src/lib/adminReportValidation';

const unauthorized = () =>
  NextResponse.json({ error: '관리자 인증이 필요합니다.' }, { status: 401 });

type Params = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Params) {
  if (!isAdminRequest(req)) return unauthorized();
  const id = Number((await params).id);
  const report = await reportService.get(id);
  if (!report) return NextResponse.json({ error: '제보를 찾을 수 없습니다.' }, { status: 404 });
  return NextResponse.json({ report });
}

export async function PATCH(req: Request, { params }: Params) {
  if (!isAdminRequest(req)) return unauthorized();
  const id = Number((await params).id);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '요청 본문이 올바른 JSON이 아닙니다.' }, { status: 400 });
  }
  const parsed = parseAdminReportAction(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: '입력값을 확인해 주세요.', details: parsed.errors }, { status: 400 });
  }

  const ctx = { actor: 'admin', now: getAppClock().now() };
  try {
    const input = parsed.input;
    if (input.action === 'approve_observation') {
      const result = await reportPromotionService.approveAsObservation(
        id,
        { field: input.field, confidence: input.confidence },
        ctx,
      );
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 422 });
      return NextResponse.json({ ok: true, id, observationId: result.observationId, confidence: result.confidence });
    }
    if (input.action === 'promote_seat_zone') {
      const result = await reportPromotionService.promoteSeatZone(
        id,
        {
          purposes: input.purposes,
          rowRange: input.rowRange,
          colRange: input.colRange,
          rationale: input.rationale,
          confidence: input.confidence,
          supersedesSeatZoneId: input.supersedesSeatZoneId,
        },
        ctx,
      );
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 422 });
      return NextResponse.json({
        ok: true,
        id,
        observationId: result.observationId,
        seatZoneId: result.seatZoneId,
        confidence: result.confidence,
      });
    }
    const result = await reportService.review(id, input.action, { actor: ctx.actor, note: input.note, now: ctx.now });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 422 });
    return NextResponse.json({ ok: true, id });
  } catch (e) {
    console.error('제보 검토 처리 실패:', e);
    return NextResponse.json({ error: '제보 처리 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
