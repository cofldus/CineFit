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
  });
  return new PostgresClient(pool, pool, false);
}
