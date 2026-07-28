import { DatabaseSync } from 'node:sqlite';
import { existsSync } from 'node:fs';
import { normalizeParams } from './types.ts';
import type { DbClient } from './types.ts';

export class DbNotSeededError extends Error {
  constructor(dbPath: string) {
    super(`SQLite DB가 없습니다: ${dbPath} — 먼저 'npm run db:seed'를 실행하세요.`);
    this.name = 'DbNotSeededError';
  }
}

class SqliteClient implements DbClient {
  readonly provider = 'sqlite' as const;
  private readonly db: DatabaseSync;
  private inTransaction = false;

  constructor(db: DatabaseSync) {
    this.db = db;
  }

  async query<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
    return this.db.prepare(sql).all(...(normalizeParams(params) as never[])) as T[];
  }

  async run(sql: string, params: unknown[] = []): Promise<{ changes: number }> {
    const result = this.db.prepare(sql).run(...(normalizeParams(params) as never[]));
    return { changes: Number(result.changes) };
  }

  async exec(sql: string): Promise<void> {
    this.db.exec(sql);
  }

  async transaction<T>(fn: (tx: DbClient) => Promise<T>): Promise<T> {
    if (this.inTransaction) return fn(this); // 중첩은 기존 트랜잭션에 합류
    this.db.exec('BEGIN');
    this.inTransaction = true;
    try {
      const result = await fn(this);
      this.db.exec('COMMIT');
      return result;
    } catch (e) {
      this.db.exec('ROLLBACK');
      throw e;
    } finally {
      this.inTransaction = false;
    }
  }

  async close(): Promise<void> {
    this.db.close();
  }
}

/** 파일 경로 또는 ':memory:' 로 SQLite 클라이언트 생성. 파일이 없으면 DbNotSeededError. */
export function createSqliteClient(path: string, opts: { mustExist?: boolean } = {}): DbClient {
  const mustExist = opts.mustExist ?? path !== ':memory:';
  if (mustExist && !existsSync(path)) throw new DbNotSeededError(path);
  return new SqliteClient(new DatabaseSync(path));
}
