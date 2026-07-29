// 식별자 연결 서비스 통합 테스트 — 인메모리 SQLite + mock KmdbClient(외부 호출 없음)
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { KmdbClient } from '../../src/data/adapters/kmdb/kmdbClient.ts';
import { createSqliteClient } from '../../src/data/client/sqliteClient';
import type { DbClient } from '../../src/data/client/types';
import {
  approveCandidate,
  getCandidatesForMovie,
  linkMovie,
  listPendingMovies,
  rejectCandidate,
  unlinkMovie,
} from '../../src/data/identifierLinkageService';

const NOW = () => new Date('2026-07-29T12:00:00+09:00');

async function freshDb(): Promise<DbClient> {
  const db = createSqliteClient(':memory:');
  await db.exec(readFileSync(join(process.cwd(), 'spikes', 'minimal-db', 'schema.sql'), 'utf8'));
  for (const f of readdirSync(join(process.cwd(), 'db', 'migrations')).filter((f) => f.endsWith('.sql')).sort()) {
    await db.exec(readFileSync(join(process.cwd(), 'db', 'migrations', f), 'utf8'));
  }
  return db;
}

const jsonResponse = (body: unknown) =>
  new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });

function clientReturning(items: Record<string, unknown>[]) {
  return new KmdbClient({
    apiKey: 'test-key',
    minIntervalMs: 0,
    fetchFn: async () => jsonResponse({ Data: [{ Result: items }] }),
  });
}

const kmdbItem = (overrides: Record<string, unknown> = {}) => ({
  DOCID: 'K-1',
  title: '듄: 파트 2',
  titleEng: 'Dune: Part Two',
  prodYear: '2024',
  directors: { director: [{ directorNm: '드니 빌뇌브' }] },
  ...overrides,
});

let db: DbClient;
let movieId: number;

beforeEach(async () => {
  db = await freshDb();
  const rows = await db.query<{ id: number }>(
    `INSERT INTO movies (title, original_title, director, created_at) VALUES ('듄: 파트2','Dune: Part Two','드니 빌뇌브',?) RETURNING id`,
    [NOW().toISOString()],
  );
  movieId = rows[0].id;
  await db.run(
    `INSERT INTO movie_releases (movie_id, country, status, release_date, info_status) VALUES (?,?,?,?,?)`,
    [movieId, 'KR', 'domestic_release', '2024-02-28', 'official'],
  );
});

describe('식별자 연결 — 자동 연결', () => {
  it('유일한 exact 후보는 자동 연결하고 movies.kmdb_docid를 채운다', async () => {
    const result = await linkMovie(clientReturning([kmdbItem()]), movieId, { db, now: NOW });
    expect(result).toMatchObject({ ok: true, overallTier: 'exact', autoLinked: true });

    const movie = (await db.query<{ kmdb_docid: string }>(`SELECT kmdb_docid FROM movies WHERE id=?`, [movieId]))[0];
    expect(movie.kmdb_docid).toBe('K-1');

    const candidates = await getCandidatesForMovie(movieId, db);
    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({ status: 'approved', autoLinked: true, matchTier: 'exact' });

    const logs = await db.query<{ action: string }>(`SELECT action FROM audit_logs WHERE target_type='movie_identifier_link'`);
    expect(logs[0].action).toBe('identifier_link_auto');
  });

  it('동점 후보가 있으면 자동 연결하지 않고 둘 다 pending으로 남긴다', async () => {
    const result = await linkMovie(
      clientReturning([kmdbItem(), kmdbItem({ DOCID: 'K-2' })]),
      movieId,
      { db, now: NOW },
    );
    expect(result).toMatchObject({ ok: true, overallTier: 'needs_review', autoLinked: false });
    const candidates = await getCandidatesForMovie(movieId, db);
    expect(candidates.every((c) => c.status === 'pending')).toBe(true);

    const movie = (await db.query<{ kmdb_docid: string | null }>(`SELECT kmdb_docid FROM movies WHERE id=?`, [movieId]))[0];
    expect(movie.kmdb_docid).toBeNull();
  });

  it('--review-only면 exact 등급이어도 자동 연결하지 않는다', async () => {
    const result = await linkMovie(clientReturning([kmdbItem()]), movieId, { db, now: NOW, reviewOnly: true });
    expect(result).toMatchObject({ ok: true, autoLinked: false });
    const movie = (await db.query<{ kmdb_docid: string | null }>(`SELECT kmdb_docid FROM movies WHERE id=?`, [movieId]))[0];
    expect(movie.kmdb_docid).toBeNull();
  });

  it('이미 연결된 영화는 오류를 반환한다', async () => {
    await db.run(`UPDATE movies SET kmdb_docid='K-old' WHERE id=?`, [movieId]);
    const result = await linkMovie(clientReturning([kmdbItem()]), movieId, { db, now: NOW });
    expect(result).toMatchObject({ ok: false });
  });

  it('dry-run은 아무것도 기록하지 않는다', async () => {
    const result = await linkMovie(clientReturning([kmdbItem()]), movieId, { db, now: NOW, dryRun: true });
    expect(result).toMatchObject({ ok: true, autoLinked: true });
    expect(await getCandidatesForMovie(movieId, db)).toHaveLength(0);
  });
});

describe('관리자 검토 흐름', () => {
  // 두 후보가 똑같이 exact 등급으로 동점이라 자동 연결되지 않고 둘 다 pending으로 남는다
  // (K-2는 참고용으로 등급을 낮춘 것도 하나 더 추가해 승인 후에도 다른 후보는 그대로인지 확인).
  beforeEach(async () => {
    await linkMovie(
      clientReturning([
        kmdbItem(),
        kmdbItem({ DOCID: 'K-2' }),
        kmdbItem({ DOCID: 'K-3', prodYear: '2019', directors: { director: [{ directorNm: '다른감독' }] } }),
      ]),
      movieId,
      { db, now: NOW },
    );
  });

  it('검토 대기 목록에 나타난다', async () => {
    const pending = await listPendingMovies(db);
    expect(pending.map((p) => p.movieId)).toContain(movieId);
  });

  it('후보를 승인하면 연결되고, 다른 후보는 거절 처리된다', async () => {
    const candidates = await getCandidatesForMovie(movieId, db);
    const target = candidates.find((c) => c.kmdbDocid === 'K-1')!;

    const result = await approveCandidate(target.id, { actor: 'admin', now: NOW, db });
    expect(result).toEqual({ ok: true });

    const movie = (await db.query<{ kmdb_docid: string }>(`SELECT kmdb_docid FROM movies WHERE id=?`, [movieId]))[0];
    expect(movie.kmdb_docid).toBe('K-1');

    const after = await getCandidatesForMovie(movieId, db);
    expect(after.find((c) => c.kmdbDocid === 'K-1')?.status).toBe('approved');
    expect(after.find((c) => c.kmdbDocid === 'K-2')?.status).toBe('pending'); // 승인 안 한 건 그대로
  });

  it('후보를 거절하면 상태만 바뀌고 다른 후보엔 영향 없다', async () => {
    const candidates = await getCandidatesForMovie(movieId, db);
    const target = candidates.find((c) => c.kmdbDocid === 'K-2')!;
    await rejectCandidate(target.id, { actor: 'admin', now: NOW, db });
    const after = await getCandidatesForMovie(movieId, db);
    expect(after.find((c) => c.kmdbDocid === 'K-2')?.status).toBe('rejected');
  });

  it('승인된 후보를 거절하면 movies.kmdb_docid가 해제된다', async () => {
    const candidates = await getCandidatesForMovie(movieId, db);
    const target = candidates.find((c) => c.kmdbDocid === 'K-1')!;
    await approveCandidate(target.id, { actor: 'admin', now: NOW, db });
    await rejectCandidate(target.id, { actor: 'admin', now: NOW, db });
    const movie = (await db.query<{ kmdb_docid: string | null }>(`SELECT kmdb_docid FROM movies WHERE id=?`, [movieId]))[0];
    expect(movie.kmdb_docid).toBeNull();
  });

  it('연결 해제는 movies.kmdb_docid를 지우고 승인 후보를 거절로 되돌린다', async () => {
    const candidates = await getCandidatesForMovie(movieId, db);
    await approveCandidate(candidates.find((c) => c.kmdbDocid === 'K-1')!.id, { actor: 'admin', now: NOW, db });

    const result = await unlinkMovie(movieId, { actor: 'admin', now: NOW, db });
    expect(result).toEqual({ ok: true });

    const movie = (await db.query<{ kmdb_docid: string | null }>(`SELECT kmdb_docid FROM movies WHERE id=?`, [movieId]))[0];
    expect(movie.kmdb_docid).toBeNull();
    const after = await getCandidatesForMovie(movieId, db);
    expect(after.find((c) => c.kmdbDocid === 'K-1')?.status).toBe('rejected');

    const logs = await db.query<{ action: string }>(
      `SELECT action FROM audit_logs WHERE target_type='movie_identifier_link' ORDER BY id DESC LIMIT 1`,
    );
    expect(logs[0].action).toBe('identifier_link_unlink');
  });

  it('연결돼 있지 않은 영화를 해제하려 하면 오류를 반환한다', async () => {
    const rows = await db.query<{ id: number }>(`INSERT INTO movies (title, created_at) VALUES ('미연결',?) RETURNING id`, [
      NOW().toISOString(),
    ]);
    const result = await unlinkMovie(rows[0].id, { actor: 'admin', now: NOW, db });
    expect(result).toMatchObject({ ok: false });
  });
});
