import { NextResponse } from 'next/server';
import { retentionService } from '../../../../../src/data/retentionService';
import { getAppClock } from '../../../../../src/lib/clock';
import { isCronRequest } from '../../../../../src/lib/cronAuth';
import { logger } from '../../../../../src/lib/logger';

export async function GET(req: Request) {
  if (!isCronRequest(req)) return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });

  try {
    const counts = await retentionService.apply(getAppClock().now(), 'vercel-cron');
    logger.info('cron_retention_apply_completed', { counts });
    return NextResponse.json({ ok: true, counts });
  } catch (e) {
    logger.error('cron_retention_apply_failed', e);
    return NextResponse.json({ error: '보존 정책 적용 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
