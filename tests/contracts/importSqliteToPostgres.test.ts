// SQLite → PostgreSQL import 워크플로 계약 테스트 — CINEFIT_TEST_PG_URL 설정 시에만 실행한다
// (로컬: cinefit_test DB, CI: service container). 운영·Supabase DB를 절대 대상으로 하지 않는다.
import { execSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { createPostgresClient } from '../../src/data/client/postgresClient';
import { importSqliteToPostgres } from '../../scripts/import-sqlite-to-postgres';

const BASE_PG_URL = process.env.CINEFIT_TEST_PG_URL;
// repositoryContracts.test.ts도 CINEFIT_TEST_PG_URL을 쓰면서 같은 DB에 DROP SCHEMA CASCADE를
// 반복한다 — vitest가 테스트 파일을 동시 실행하면 두 파일이 같은 DB를 파괴적으로 건드리며
// 충돌한다(발견: 8차 마일스톤, "Called end on pool more than once" 등 원인 불명 오류로 나타남).
// 이 파일 전용 DB를 따로 둬서 완전히 격리한다(다른 테스트가 임시 SQLite 파일을 쓰는 것과 같은 원칙).
const TEST_DB_NAME = 'cinefit_test_import';
const PG_URL = BASE_PG_URL ? BASE_PG_URL.replace(/\/[^/?]+(\?.*)?$/, `/${TEST_DB_NAME}$1`) : undefined;

describe.skipIf(!BASE_PG_URL)('SQLite → PostgreSQL import (CINEFIT_TEST_PG_URL 필요)', () => {
  let sqlitePath: string;

  beforeAll(async () => {
    const dir = mkdtempSync(join(tmpdir(), 'cinefit-import-'));
    sqlitePath = join(dir, 'source.db');
    const env = { ...process.env, CINEFIT_DB_PATH: sqlitePath };
    execSync('node spikes/minimal-db/seed.mjs', { env });
    execSync('node db/migrate.mjs', { env });
    execSync('node db/seed-seat-zones.mjs', { env });
    execSync('node db/seed-aliases.mjs', { env });
    execSync('node db/seed-feature-flags.mjs', { env });
    expect(existsSync(sqlitePath)).toBe(true);

    // 이 테스트 전용 DB가 없으면 만든다(기본 DB 이름의 'postgres' 관리 DB에 접속해서 생성).
    const adminUrl = BASE_PG_URL!.replace(/\/[^/?]+(\?.*)?$/, '/postgres$1');
    const admin = createPostgresClient(adminUrl);
    const exists = await admin.query<{ n: number }>(
      `SELECT 1 AS n FROM pg_database WHERE datname = '${TEST_DB_NAME}'`,
    );
    if (!exists.length) await admin.exec(`CREATE DATABASE ${TEST_DB_NAME}`);
    await admin.close();
  });

  async function resetTargetSchema(): Promise<void> {
    const pg = createPostgresClient(PG_URL!);
    await pg.exec('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
    const dir = join(process.cwd(), 'db', 'migrations-postgres');
    for (const f of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
      await pg.exec(readFileSync(join(dir, f), 'utf8'));
    }
    await pg.close();
  }

  async function countRows(table: string): Promise<number> {
    const pg = createPostgresClient(PG_URL!);
    const rows = await pg.query<{ n: number }>(`SELECT COUNT(*)::int AS n FROM ${table}`);
    await pg.close();
    return rows[0].n;
  }

  it('dry-run은 아무것도 남기지 않는다', async () => {
    await resetTargetSchema();
    const result = await importSqliteToPostgres({ sourcePath: sqlitePath, pgUrl: PG_URL!, dryRun: true });
    expect(result.dryRun).toBe(true);
    expect(result.summary.get('movies')?.created).toBe(3);
    expect(await countRows('movies')).toBe(0);
  });

  it('실제 실행은 시드 데이터를 그대로 옮긴다(별칭·기능 플래그 포함)', async () => {
    await resetTargetSchema();
    const result = await importSqliteToPostgres({ sourcePath: sqlitePath, pgUrl: PG_URL! });
    expect(result.summary.get('movies')).toEqual({ created: 3, updated: 0, skipped: 0, failed: 0 });
    expect(await countRows('movies')).toBe(3);
    expect(await countRows('auditoriums')).toBe(10);
    expect(await countRows('showtimes')).toBe(15);
    expect(await countRows('movie_aliases')).toBe(1);
    expect(await countRows('auditorium_aliases')).toBe(4);
    expect(await countRows('feature_flags')).toBe(1);

    // 합성 회차 플래그가 그대로 보존됐는지 확인
    const pg = createPostgresClient(PG_URL!);
    const rows = await pg.query<{ is_synthetic: number }>(`SELECT DISTINCT is_synthetic FROM showtimes`);
    await pg.close();
    expect(rows).toEqual([{ is_synthetic: 1 }]);
  });

  it('같은 소스를 다시 실행해도 중복이 생기지 않는다(멱등)', async () => {
    await resetTargetSchema();
    await importSqliteToPostgres({ sourcePath: sqlitePath, pgUrl: PG_URL! });
    const second = await importSqliteToPostgres({ sourcePath: sqlitePath, pgUrl: PG_URL! });

    expect(second.summary.get('auditoriums')).toEqual({ created: 0, updated: 0, skipped: 10, failed: 0 });
    expect(second.summary.get('movie_aliases')).toEqual({ created: 0, updated: 0, skipped: 1, failed: 0 });
    expect(await countRows('movies')).toBe(3);
    expect(await countRows('auditoriums')).toBe(10);
  });

  it('중간에 실패하면 이미 성공한 앞쪽 테이블 삽입까지 전부 롤백된다', async () => {
    await resetTargetSchema();
    const pg = createPostgresClient(PG_URL!);
    // seat_zones는 sources/movies/auditoriums보다 늦게 처리되는 테이블 — 이 테이블을 없애서
    // 그 앞의 삽입이 이미 성공한 상태에서 트랜잭션 전체가 롤백되는지 확인한다.
    await pg.exec('ALTER TABLE seat_zones RENAME TO seat_zones_hidden_for_test;');
    await pg.close();

    await expect(importSqliteToPostgres({ sourcePath: sqlitePath, pgUrl: PG_URL! })).rejects.toThrow('import 실패');

    expect(await countRows('sources')).toBe(0);
    expect(await countRows('movies')).toBe(0);
    expect(await countRows('auditoriums')).toBe(0);

    const restore = createPostgresClient(PG_URL!);
    await restore.exec('ALTER TABLE seat_zones_hidden_for_test RENAME TO seat_zones;');
    await restore.close();
  });
});
