import pg from 'pg';
import { normalizeParams } from './types.ts';
import type { DbClient } from './types.ts';

// ? → $n 변환 (작은따옴표 문자열 내부는 건너뜀)
export function toPgPlaceholders(sql: string): string {
  let out = '';
  let n = 0;
  let inString = false;
  for (const ch of sql) {
    if (ch === "'") {
      inString = !inString;
      out += ch;
    } else if (ch === '?' && !inString) {
      out += `$${++n}`;
    } else {
      out += ch;
    }
  }
  return out;
}

type Queryable = pg.Pool | pg.PoolClient;

class PostgresClient implements DbClient {
  readonly provider = 'postgres' as const;
  private readonly conn: Queryable;
  private readonly pool: pg.Pool | null;
  private readonly inTransaction: boolean;

  constructor(conn: Queryable, pool: pg.Pool | null, inTransaction: boolean) {
    this.conn = conn;
    this.pool = pool;
    this.inTransaction = inTransaction;
  }

  async query<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
    const res = await this.conn.query(toPgPlaceholders(sql), normalizeParams(params));
    return res.rows as T[];
  }

  async run(sql: string, params: unknown[] = []): Promise<{ changes: number }> {
    const res = await this.conn.query(toPgPlaceholders(sql), normalizeParams(params));
    return { changes: res.rowCount ?? 0 };
  }

  async exec(sql: string): Promise<void> {
    await this.conn.query(sql); // 파라미터 없는 멀티 스테이트먼트 — simple query protocol
  }

  async transaction<T>(fn: (tx: DbClient) => Promise<T>): Promise<T> {
    if (this.inTransaction) return fn(this); // 중첩은 기존 트랜잭션에 합류
    if (!this.pool) throw new Error('transaction: pool 없는 클라이언트');
    const client = await this.pool.connect();
    const tx = new PostgresClient(client, null, true);
    try {
      await client.query('BEGIN');
      const result = await fn(tx);
      await client.query('COMMIT');
      return result;
    } catch (e) {
      await client.query('ROLLBACK').catch(() => {});
      throw e;
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    await this.pool?.end();
  }
}

export function createPostgresClient(databaseUrl: string): DbClient {
  const pool = new pg.Pool({
    connectionString: databaseUrl,
    max: 10,
    // Supabase 등 관리형 PG는 TLS 필수 — 로컬(127.0.0.1/localhost)은 비활성
    ssl: /localhost|127\.0\.0\.1/.test(databaseUrl) ? undefined : { rejectUnauthorized: false },
    // 운영 안전장치 — 커넥션을 못 얻거나 유휴 상태거나 쿼리가 멈추면 앱 전체가 아니라
    // 해당 요청만 실패하게 한다(pool.max 소진으로 전체 서비스가 멈추는 것 방지).
    connectionTimeoutMillis: 10_000, // 풀에서 커넥션을 못 얻으면 10초 후 실패
    idleTimeoutMillis: 30_000, // 유휴 커넥션 30초 후 반환
    statement_timeout: 30_000, // 쿼리 하나가 30초 넘게 걸리면 서버가 강제 종료
    query_timeout: 35_000, // 드라이버 쪽 타임아웃(네트워크 단절 등 대비, statement_timeout보다 여유를 둠)
  });
  return new PostgresClient(pool, pool, false);
}
