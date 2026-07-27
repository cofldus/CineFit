import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

// 개발 핫리로드에서 커넥션 누수 방지용 전역 캐시
const g = globalThis as typeof globalThis & { __cinefitDb?: DatabaseSync };

export function getDbPath(): string {
  return (
    process.env.CINEFIT_DB_PATH ??
    path.join(process.cwd(), 'spikes', 'minimal-db', 'cinefit-spike.db')
  );
}

export class DbNotSeededError extends Error {
  constructor(dbPath: string) {
    super(`SQLite DB가 없습니다: ${dbPath} — 먼저 'npm run db:seed'를 실행하세요.`);
    this.name = 'DbNotSeededError';
  }
}

export function getDb(): DatabaseSync {
  if (g.__cinefitDb) return g.__cinefitDb;
  const dbPath = getDbPath();
  if (!fs.existsSync(dbPath)) throw new DbNotSeededError(dbPath);
  g.__cinefitDb = new DatabaseSync(dbPath);
  return g.__cinefitDb;
}
