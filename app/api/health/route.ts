import { NextResponse } from 'next/server';
import { getAppDbClient, resolveProvider } from '../../../src/data/client/index';
import { getMigrationStatus } from '../../../src/data/migrationStatus';
import { logger } from '../../../src/lib/logger';

// 배포 후 스모크 테스트·업타임 모니터링용 — 인증 없이 공개된다. DB 연결 문자열·스택 트레이스
// 등 민감한 내용은 응답에 절대 포함하지 않는다(로그에만 남긴다).
// R21.1 §1: 마이그레이션 미적용 시 'degraded'(503)를 명확히 반환한다 — 009 적용 여부를
// /api/health 한 번으로 확인할 수 있다(pendingMigrations에 파일명 노출 — 스키마 내부
// 정보가 아니라 리포에 공개된 마이그레이션 이름이다).
export async function GET() {
  try {
    const provider = resolveProvider();
    const db = getAppDbClient();
    await db.query('SELECT 1 AS ok');
    const migrations = await getMigrationStatus(db, provider);
    const base = {
      dbProvider: provider,
      migrations: {
        appliedCount: migrations.appliedCount,
        latestApplied: migrations.latestApplied,
        pendingCount: migrations.pending.length,
      },
      time: new Date().toISOString(),
    };
    if (!migrations.ok) {
      return NextResponse.json(
        { status: 'degraded', reason: 'pending_migrations', pendingMigrations: migrations.pending, ...base },
        { status: 503 },
      );
    }
    return NextResponse.json({ status: 'ok', ...base });
  } catch (e) {
    logger.error('health_check_db_failed', e);
    return NextResponse.json({ status: 'error' }, { status: 503 });
  }
}
