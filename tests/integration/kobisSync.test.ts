// KOBIS 동기화 통합 테스트 — 인메모리 SQLite(DbClient)에 스키마+마이그레이션 적용,
// 외부 API 없이 정규화 값 주입. (동일 계약이 PostgreSQL에서도 계약 테스트로 검증됨)
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { ingestNormalizedMovie } from '../../src/data/adapters/kobis/kobisSyncService.ts';
import type { NormalizedKobisMovie } from '../../src/data/adapters/kobis/kobisTypes.ts';
import { createSqliteClient } from '../../src/data/client/sqliteClient';
import type { DbClient } from '../../src/data/client/types';

const NOW = () => new Date('2026-07-27T12:00:00+09:00');

async function freshDb(): Promise<DbClient> {
  const db = createSqliteClient(':memory:');
  await db.exec(readFileSync(join(process.cwd(), 'spikes', 'minimal-db', 'schema.sql'), 'utf8'));
  for (const f of readdirSync(join(process.cwd(), 'db', 'migrations')).filter((f) => f.endsWith('.sql')).sort()) {
    await db.exec(readFileSync(join(process.cwd(), 'db', 'migrations', f), 'utf8'));
  }
  return db;
}

const dune = (overrides: Partial<NormalizedKobisMovie> = {}): NormalizedKobisMovie => ({
  kobisCode: '20236295',
  title: '듄: 파트2',
  titleEn: 'Dune: Part Two',
  runtimeMin: 165,
  prodYear: 2024,
  openDate: '2024-02-28',
  genres: ['액션'],
  directors: ['드니 빌뇌브'],
  rating: '12세이상관람가',
  formats: [
    { raw: '2D/디지털', normalized: 'standard' },
    { raw: 'IMAX/IMAX', normalized: 'imax' },
  ],
  ...overrides,
});

const count = async (db: DbClient, table: string) =>
  Number((await db.query<{ n: number }>(`SELECT COUNT(*) AS n FROM ${table}`))[0].n);

let db: DbClient;
beforeEach(async () => {
  db = await freshDb();
});

describe('KOBIS 관찰 로그 → 승격 파이프라인', () => {
  it('신규 영화를 생성하고 관찰 로그·포맷 버전을 남긴다', async () => {
    const outcome = await ingestNormalizedMovie(dune(), { db, now: NOW });
    expect(outcome).toBe('created');

    const movie = (await db.query(`SELECT * FROM movies WHERE kobis_code='20236295'`))[0];
    expect(movie.title).toBe('듄: 파트2');
    expect(movie.runtime_min).toBe(165);

    const obs = await db.query<{ status: string }>(`SELECT status FROM external_observations`);
    expect(obs).toHaveLength(1);
    expect(obs[0].status).toBe('promoted');

    const versions = await db.query(`SELECT info_status, source_name FROM movie_format_versions`);
    expect(versions).toHaveLength(2);
    expect(versions.every((v) => v.info_status === 'official' && v.source_name === 'KOBIS')).toBe(true);
  });

  it('제목 매칭으로 기존 영화를 갱신하고 kobis_code를 연결한다', async () => {
    await db.run(
      `INSERT INTO movies (title, original_title, runtime_min) VALUES ('듄: 파트 2', 'Dune: Part Two', 166)`,
    );
    const outcome = await ingestNormalizedMovie(dune(), { db, now: NOW });
    expect(outcome).toBe('updated');
    const rows = await db.query(`SELECT title, kobis_code, runtime_min FROM movies`);
    expect(rows).toHaveLength(1); // 중복 생성 없음
    expect(rows[0]).toMatchObject({ title: '듄: 파트2', kobis_code: '20236295', runtime_min: 165 });
  });

  it('동일 해시 재수신은 unchanged로 기록하고 중복 승격하지 않는다', async () => {
    await ingestNormalizedMovie(dune(), { db, now: NOW });
    const outcome = await ingestNormalizedMovie(dune(), {
      db,
      now: () => new Date('2026-07-28T12:00:00+09:00'),
    });
    expect(outcome).toBe('unchanged');
    const statuses = (await db.query<{ status: string }>(`SELECT status FROM external_observations ORDER BY id`)).map(
      (r) => r.status,
    );
    expect(statuses).toEqual(['promoted', 'unchanged']);
    expect(await count(db, 'movie_format_versions')).toBe(2);
  });

  it('변경 재수신은 diff와 함께 갱신한다 (포맷 버전 교체, 중복 없음)', async () => {
    await ingestNormalizedMovie(dune(), { db, now: NOW });
    const changed = dune({
      runtimeMin: 166,
      formats: [
        { raw: '2D/디지털', normalized: 'standard' },
        { raw: 'IMAX/IMAX', normalized: 'imax' },
        { raw: 'DOLBYCINEMA/DOLBYCINEMA', normalized: 'dolby_cinema' },
      ],
    });
    const outcome = await ingestNormalizedMovie(changed, {
      db,
      now: () => new Date('2026-07-28T12:00:00+09:00'),
    });
    expect(outcome).toBe('updated');
    const last = (await db.query<{ diff: string }>(`SELECT diff FROM external_observations ORDER BY id DESC LIMIT 1`))[0];
    const diff = JSON.parse(last.diff) as Record<string, unknown>;
    expect(Object.keys(diff)).toEqual(expect.arrayContaining(['runtimeMin', 'formats']));
    expect(await count(db, 'movie_format_versions')).toBe(3);
  });

  it('동명 복수 후보는 승격을 보류하고 error 관찰로 남긴다', async () => {
    await db.run(`INSERT INTO movies (title, runtime_min) VALUES ('듄: 파트2', 166)`);
    await db.run(`INSERT INTO movies (title, runtime_min) VALUES ('듄 파트 2', 120)`);
    const outcome = await ingestNormalizedMovie(dune({ prodYear: null }), { db, now: NOW });
    expect(outcome).toBe('duplicate');
    expect((await db.query<{ status: string }>(`SELECT status FROM external_observations`))[0].status).toBe('error');
    expect(
      Number((await db.query<{ n: number }>(`SELECT COUNT(*) n FROM movies WHERE kobis_code IS NOT NULL`))[0].n),
    ).toBe(0);
  });

  it('dry-run은 아무것도 기록하지 않는다', async () => {
    const outcome = await ingestNormalizedMovie(dune(), { db, now: NOW, dryRun: true });
    expect(outcome).toBe('created');
    expect(await count(db, 'external_observations')).toBe(0);
    expect(await count(db, 'movies')).toBe(0);
  });
});
