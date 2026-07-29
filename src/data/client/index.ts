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

// 정상 종료(graceful shutdown) — 컨테이너·자체 호스팅 등 프로세스가 SIGTERM/SIGINT를 받는
// 환경에서 커넥션 풀을 깨끗이 닫는다. 서버리스(Vercel)는 인스턴스가 요청 단위로 짧게 살아
// 있어 이 훅이 사실상 호출되지 않지만, 자체 호스팅·로컬 실행에서는 필요하다.
// 모듈은 여러 번 임포트돼도(Next.js dev 리로드 등) 리스너가 중복 등록되지 않게 가드한다.
const gg = globalThis as typeof globalThis & { __cinefitShutdownRegistered?: boolean };
if (!gg.__cinefitShutdownRegistered) {
  gg.__cinefitShutdownRegistered = true;
  const shutdown = (signal: string) => {
    if (!g.__cinefitClient) {
      process.exit(0);
      return;
    }
    console.log(`[cinefit] ${signal} 수신 — DB 커넥션 정리 후 종료`);
    g.__cinefitClient
      .close()
      .catch((e) => console.error('[cinefit] DB 종료 중 오류:', e))
      .finally(() => process.exit(0));
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}
