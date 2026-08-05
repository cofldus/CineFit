// R21.1 §1 — 마이그레이션 상태: 코드 상수(EXPECTED_MIGRATIONS)가 실제 디렉터리와
// 일치하는지 강제한다 + 미적용 시 pending을 정확히 보고하는지.
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createSqliteClient } from '../../src/data/client/sqliteClient';
import { EXPECTED_MIGRATIONS, getMigrationStatus } from '../../src/data/migrationStatus';

describe('EXPECTED_MIGRATIONS', () => {
  it('SQLite 목록이 db/migrations 디렉터리와 정확히 일치한다', () => {
    const actual = readdirSync(join(process.cwd(), 'db', 'migrations'))
      .filter((f) => f.endsWith('.sql'))
      .sort();
    expect(EXPECTED_MIGRATIONS.sqlite).toEqual(actual);
  });

  it('PostgreSQL 목록이 db/migrations-postgres 디렉터리와 정확히 일치한다', () => {
    const actual = readdirSync(join(process.cwd(), 'db', 'migrations-postgres'))
      .filter((f) => f.endsWith('.sql'))
      .sort();
    expect(EXPECTED_MIGRATIONS.postgres).toEqual(actual);
  });
});

describe('getMigrationStatus', () => {
  it('일부만 적용된 DB에서 pending을 정확히 보고한다', async () => {
    const db = createSqliteClient(':memory:');
    await db.exec(`CREATE TABLE schema_migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL)`);
    for (const name of EXPECTED_MIGRATIONS.sqlite.slice(0, 8)) {
      await db.run(`INSERT INTO schema_migrations (name, applied_at) VALUES (?, ?)`, [name, '2026-08-01']);
    }
    const status = await getMigrationStatus(db, 'sqlite');
    expect(status.ok).toBe(false);
    expect(status.pending).toEqual(['009_r21_showtime_ops_trace.sql']);
    expect(status.appliedCount).toBe(8);
    await db.close();
  });

  it('전부 적용되면 ok=true, pending 없음', async () => {
    const db = createSqliteClient(':memory:');
    await db.exec(`CREATE TABLE schema_migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL)`);
    for (const name of EXPECTED_MIGRATIONS.sqlite) {
      await db.run(`INSERT INTO schema_migrations (name, applied_at) VALUES (?, ?)`, [name, '2026-08-01']);
    }
    const status = await getMigrationStatus(db, 'sqlite');
    expect(status.ok).toBe(true);
    expect(status.latestApplied).toBe('009_r21_showtime_ops_trace.sql');
    await db.close();
  });

  it('schema_migrations 테이블이 없으면 전체가 pending이다', async () => {
    const db = createSqliteClient(':memory:');
    const status = await getMigrationStatus(db, 'sqlite');
    expect(status.ok).toBe(false);
    expect(status.pending).toEqual(EXPECTED_MIGRATIONS.sqlite);
    await db.close();
  });
});
