import { NextResponse } from 'next/server';
import { reportService } from '../../../../src/data/reportService';
import { isAdminRequest } from '../../../../src/lib/adminAuth';

const unauthorized = () =>
  NextResponse.json({ error: '관리자 인증이 필요합니다.' }, { status: 401 });

export async function GET(req: Request) {
  if (!isAdminRequest(req)) return unauthorized();
  const url = new URL(req.url);
  const q = (k: string) => url.searchParams.get(k) ?? undefined;
  try {
    const rows = await reportService.list({
      status: q('status'),
      reportType: q('reportType'),
      targetType: q('targetType'),
      targetId: q('targetId') ? Number(q('targetId')) : undefined,
      hasEvidence: q('hasEvidence') === undefined ? undefined : q('hasEvidence') === 'true',
    });
    // 연락 이메일·세션 해시는 목록에 불필요 — 응답에서 제외
    return NextResponse.json({
      reports: rows.map((r) => {
        const redacted: Record<string, unknown> = { ...r };
        delete redacted.contact_email;
        delete redacted.anonymous_session_hash;
        return redacted;
      }),
    });
  } catch (e) {
    console.error('관리자 제보 목록 실패:', e);
    return NextResponse.json({ error: '제보 목록 조회 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
