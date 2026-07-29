// KMDb 동기화 통합 테스트 — 인메모리 SQLite(DbClient)에 스키마+마이그레이션 적용,
// 외부 API 없이 mock fetch로 KmdbClient 주입.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { KmdbClient } from '../../src/data/adapters/kmdb/kmdbClient.ts';
import { syncLinkedMovie } from '../../src/data/adapters/kmdb/kmdbSyncService.ts';
import { createSqliteClient } from '../../src/data/client/sqliteClient';
import type { DbClient } from '../../src/data/client/types';

const NOW = () => new Date('2026-07-27T12:00:00+09:00');
const DOCID = 'K-24812345';

async function freshDb(): Promise<DbClient> {
  const db = createSqliteClient(':memory:');
  await db.exec(readFileSync(join(process.cwd(), 'spikes', 'minimal-db', 'schema.sql'), 'utf8'));
  for (const f of readdirSync(join(process.cwd(), 'db', 'migrations')).filter((f) => f.endsWith('.sql')).sort()) {
    await db.exec(readFileSync(join(process.cwd(), 'db', 'migrations', f), 'utf8'));
  }
  return db;
}

const searchFixture = (overrides: Record<string, unknown> = {}) => ({
  Data: [
    {
      Result: [
        {
          DOCID,
          title: '듄: 파트 2',
          titleEng: 'Dune: Part Two',
          prodYear: '2024',
          runtime: '166',
          repRlsDate: '2024-02-28',
          rating: '12세이상관람가',
          directors: { director: [{ directorNm: '드니 빌뇌브' }] },
          plots: { plot: [{ plotText: '줄거리 요약' }] },
          screenArea: '2.39:1',
          soundEcho: 'Dolby Atmos',
          fSound: '',
          ...overrides,
        },
      ],
    },
  ],
});

const jsonResponse = (body: unknown) =>
  new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });

function clientReturning(body: unknown) {
  return new KmdbClient({ apiKey: 'test-key', minIntervalMs: 0, fetchFn: async () => jsonResponse(body) });
}

const count = async (db: DbClient, table: string) =>
  Number((await db.query<{ n: number }>(`SELECT COUNT(*) AS n FROM ${table}`))[0].n);

let db: DbClient;
let movieId: number;
beforeEach(async () => {
  db = await freshDb();
  const rows = await db.query<{ id: number }>(
    `INSERT INTO movies (title, kmdb_docid, created_at) VALUES ('듄: 파트 2', ?, ?) RETURNING id`,
    [DOCID, NOW().toISOString()],
  );
  movieId = rows[0].id;
});

describe('KMDb 동기화', () => {
  it('연결이 안 된 영화는 오류를 반환한다(kmdb_docid 없음)', async () => {
    const rows = await db.query<{ id: number }>(`INSERT INTO movies (title, created_at) VALUES ('연결안됨',?) RETURNING id`, [
      NOW().toISOString(),
    ]);
    const result = await syncLinkedMovie(clientReturning(searchFixture()), rows[0].id, { db, now: NOW });
    expect(result).toMatchObject({ outcome: 'error' });
  });

  it('줄거리와 기술 필드를 반영하고 관찰 로그를 남긴다', async () => {
    const result = await syncLinkedMovie(clientReturning(searchFixture()), movieId, { db, now: NOW });
    expect(result).toMatchObject({ outcome: 'promoted', specsPromoted: 2 });

    const specs = await db.query<{ spec_key: string; info_status: string; value: string }>(
      `SELECT spec_key, info_status, value FROM movie_technical_specs WHERE movie_id=? ORDER BY spec_key`,
      [movieId],
    );
    expect(specs.map((s) => s.spec_key)).toEqual(['kmdb_screen_area', 'kmdb_sound_echo']);
    expect(specs.every((s) => s.info_status === 'single_unverified')).toBe(true);

    const obs = await db.query<{ status: string }>(`SELECT status FROM external_observations WHERE provider='kmdb'`);
    expect(obs).toHaveLength(1);
    expect(obs[0].status).toBe('promoted');

    const plot = await db.query<{ field: string }>(`SELECT field FROM observations WHERE entity_type='movie' AND entity_id=?`, [
      movieId,
    ]);
    expect(plot.map((p) => p.field)).toContain('plot_summary');
  });

  it('기존 다른 출처의 movie_technical_specs 행은 절대 건드리지 않는다', async () => {
    await db.run(
      `INSERT INTO sources (kind, name, trust_weight) VALUES ('official_api','KOBIS',1.0)`,
    );
    const src = (await db.query<{ id: number }>(`SELECT id FROM sources WHERE name='KOBIS'`))[0].id;
    await db.run(
      `INSERT INTO movie_technical_specs (movie_id, spec_key, value, source_id, info_status, observed_at, confidence)
       VALUES (?,?,?,?,?,?,?)`,
      [movieId, 'native_ar', JSON.stringify('1.90'), src, 'official', NOW().toISOString(), 1.0],
    );
    await syncLinkedMovie(clientReturning(searchFixture()), movieId, { db, now: NOW });

    const kobisRow = await db.query<{ value: string }>(
      `SELECT value FROM movie_technical_specs WHERE movie_id=? AND spec_key='native_ar'`,
      [movieId],
    );
    expect(kobisRow[0].value).toBe(JSON.stringify('1.90')); // 그대로 보존
  });

  it('동일 해시 재수신은 unchanged로 기록하고 재승격하지 않는다', async () => {
    await syncLinkedMovie(clientReturning(searchFixture()), movieId, { db, now: NOW });
    const result = await syncLinkedMovie(clientReturning(searchFixture()), movieId, {
      db,
      now: () => new Date('2026-07-28T12:00:00+09:00'),
    });
    expect(result).toEqual({ outcome: 'unchanged' });
    expect(await count(db, 'movie_technical_specs')).toBe(2); // 중복 없음
  });

  it('검색 결과에 연결된 DOCID가 없으면 오류를 반환한다', async () => {
    const result = await syncLinkedMovie(clientReturning({ Data: [{ Result: [] }] }), movieId, { db, now: NOW });
    expect(result).toMatchObject({ outcome: 'error' });
    expect(await count(db, 'external_observations')).toBe(0);
  });

  it('dry-run은 아무것도 기록하지 않는다', async () => {
    const result = await syncLinkedMovie(clientReturning(searchFixture()), movieId, { db, now: NOW, dryRun: true });
    expect(result).toMatchObject({ outcome: 'dry_run', wouldPromote: 2 });
    expect(await count(db, 'external_observations')).toBe(0);
    expect(await count(db, 'movie_technical_specs')).toBe(0);
  });
});
