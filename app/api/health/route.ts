import { NextResponse } from 'next/server';
import { getAppDbClient, resolveProvider } from '../../../src/data/client/index';
import { logger } from '../../../src/lib/logger';

// 배포 후 스모크 테스트·업타임 모니터링용 — 인증 없이 공개된다. DB 연결 문자열·스택 트레이스
// 등 민감한 내용은 응답에 절대 포함하지 않는다(로그에만 남긴다).
export async function GET() {
  try {
    await getAppDbClient().query('SELECT 1 AS ok');
    return NextResponse.json({ status: 'ok', dbProvider: resolveProvider(), time: new Date().toISOString() });
  } catch (e) {
    logger.error('health_check_db_failed', e);
    return NextResponse.json({ status: 'error' }, { status: 503 });
  }
}
