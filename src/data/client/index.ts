// 앱 전역 DB 클라이언트 — DATABASE_PROVIDER(sqlite 기본)로 선택.
// CINEFIT_ENV=production 이면 postgres만 허용 (실수로 SQLite 운영 배포 방지).
import path from 'node:path';
import { createPostgresClient } from './postgresClient.ts';
import { createSqliteClient } from './sqliteClient.ts';
import type { DbClient, DbProvider } from './types.ts';

export { DbNotSeededError } from './sqliteClient.ts';
export type { DbClient, DbProvider } from './types.ts';

const g = globalThis as typeof globalThis & { __cinefitClient?: DbClient };

export function resolveProvider(): DbProvider {
  const raw = (process.env.DATABASE_PROVIDER ?? 'sqlite').toLowerCase();
  if (raw !== 'sqlite' && raw !== 'postgres') {
    throw new Error(`DATABASE_PROVIDER 값이 잘못되었습니다: "${raw}" (sqlite | postgres)`);
  }
  if (process.env.CINEFIT_ENV === 'production' && raw !== 'postgres') {
    throw new Error(
      'CINEFIT_ENV=production 에서는 DATABASE_PROVIDER=postgres 만 허용됩니다. ' +
        'SQLite는 서버리스·운영 환경의 영속 저장소로 사용할 수 없습니다 (docs/DATABASE.md).',
    );
  }
  return raw;
}

export function getSqlitePath(): string {
  return (
    process.env.CINEFIT_DB_PATH ??
    path.join(process.cwd(), 'spikes', 'minimal-db', 'cinefit-spike.db')
  );
}

export function createClientForProvider(provider: DbProvider): DbClient {
  if (provider === 'postgres') {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error(
        'DATABASE_PROVIDER=postgres 인데 DATABASE_URL 이 없습니다. ' +
          '로컬 개발: npm run pg:up 후 .env에 ' +
          'DATABASE_URL=postgres://cinefit:cinefit-dev-only@127.0.0.1:55432/cinefit_dev 를 설정하세요.',
      );
    }
    return createPostgresClient(url);
  }
  return createSqliteClient(getSqlitePath());
}

export function getAppDbClient(): DbClient {
  if (!g.__cinefitClient) g.__cinefitClient = createClientForProvider(resolveProvider());
  return g.__cinefitClient;
}

/** 테스트 전용 — 전역 클라이언트 캐시 초기화 */
export function resetAppDbClientForTests(): void {
  g.__cinefitClient = undefined;
}
