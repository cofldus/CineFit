// 공급자 독립 DB 클라이언트 계약 — 리포지토리는 이 인터페이스만 사용한다.
// SQL 규칙(양쪽 방언 공통 부분집합):
//  - 플레이스홀더는 ? (postgres 클라이언트가 $n으로 변환)
//  - INSERT는 RETURNING id 로 생성 id를 받는다 (SQLite ≥3.35 / PostgreSQL 공통)
//  - 타임스탬프는 ISO 8601 UTC TEXT로 저장 (시간대 계산은 JS에서 — src/lib/clock.ts)
//  - 불리언은 0/1 INTEGER, JSON은 TEXT
//  - DB 기본값(datetime('now') 등)에 의존하지 말고 앱이 항상 값을 명시한다
export type DbProvider = 'sqlite' | 'postgres';

export interface DbClient {
  readonly provider: DbProvider;
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
  run(sql: string, params?: unknown[]): Promise<{ changes: number }>;
  /** 파라미터 없는 멀티 스테이트먼트 스크립트 실행 (마이그레이션·스키마 로드용) */
  exec(sql: string): Promise<void>;
  /** 트랜잭션 — fn이 던지면 롤백. 중첩 호출은 같은 트랜잭션에 합류한다. */
  transaction<T>(fn: (tx: DbClient) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

/** 파라미터 정규화: boolean→0/1, Date→ISO, undefined→null */
export function normalizeParams(params: unknown[] = []): unknown[] {
  return params.map((p) => {
    if (p === undefined) return null;
    if (typeof p === 'boolean') return p ? 1 : 0;
    if (p instanceof Date) return p.toISOString();
    return p;
  });
}
