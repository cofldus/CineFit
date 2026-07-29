import { NextResponse } from 'next/server';
import { validateBookingLinks } from '../../../../../scripts/maintenance/validateBookingLinks';
import { isCronRequest } from '../../../../../src/lib/cronAuth';
import { logger } from '../../../../../src/lib/logger';

// 활성 회차 수만큼 순차 HEAD 요청(요청 사이 500ms 지연)이라 알파 규모에서도 기본 10초
// 제한을 넘을 수 있다 — Vercel Pro 이상에서 이 값을 늘려 잡는다.
export const maxDuration = 60;

export async function GET(req: Request) {
  if (!isCronRequest(req)) return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });

  try {
    const result = await validateBookingLinks();
    logger.info('cron_maintenance_links_completed', { totalChecked: result.totalChecked, summary: result.summary });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    logger.error('cron_maintenance_links_failed', e);
    return NextResponse.json({ error: '예매 링크 검증 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
