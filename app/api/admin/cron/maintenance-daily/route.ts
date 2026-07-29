import { NextResponse } from 'next/server';
import { runDailyMaintenance } from '../../../../../scripts/maintenance-daily';
import { isCronRequest } from '../../../../../src/lib/cronAuth';
import { logger } from '../../../../../src/lib/logger';

export async function GET(req: Request) {
  if (!isCronRequest(req)) return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });

  try {
    const result = await runDailyMaintenance();
    logger.info('cron_maintenance_daily_completed', {
      expiredCount: result.expired.expiredCount,
      staleCount: result.stale.staleCount,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    logger.error('cron_maintenance_daily_failed', e);
    return NextResponse.json({ error: '일일 유지보수 실행 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
