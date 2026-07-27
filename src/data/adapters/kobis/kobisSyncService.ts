// KOBIS 동기화 — 불변 관찰 로그를 거쳐 핵심 테이블로 승격한다.
// 흐름: KOBIS 응답 → 정규화 → external_observations 기록 → (해시 비교) → movies/releases/format_versions 승격
// 핵심 테이블을 직접 덮어쓰지 않으며, 동일 해시 재수신 시 승격을 건너뛴다.
import { createHash } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import { getDb } from '../../db.ts';
import { KobisClient, KobisError } from './kobisClient.ts';
import { mapBoxOffice, mapMovieInfo } from './kobisMapper.ts';
import type { NormalizedKobisMovie, SyncCounts } from './kobisTypes.ts';

export type SyncOutcome = 'created' | 'updated' | 'unchanged' | 'duplicate' | 'error';

export interface SyncOptions {
  dryRun?: boolean;
  now?: () => Date;
  log?: (message: string) => void;
  db?: DatabaseSync; // 테스트 주입
}

const norm = (s: string | null | undefined) =>
  (s ?? '').replace(/[\s:·,\-–—!?.]/g, '').toLowerCase();

function hashOf(m: NormalizedKobisMovie): string {
  return createHash('sha256').update(JSON.stringify(m)).digest('hex');
}

function shallowDiff(prev: NormalizedKobisMovie | null, next: NormalizedKobisMovie) {
  if (!prev) return null;
  const diff: Record<string, { before: unknown; after: unknown }> = {};
  for (const key of Object.keys(next) as (keyof NormalizedKobisMovie)[]) {
    const b = JSON.stringify(prev[key]);
    const a = JSON.stringify(next[key]);
    if (b !== a) diff[key] = { before: prev[key], after: next[key] };
  }
  return Object.keys(diff).length ? diff : null;
}

function getOrCreateKobisSource(db: DatabaseSync): number {
  const row = db.prepare(`SELECT id FROM sources WHERE name = 'KOBIS'`).get() as
    | { id: number }
    | undefined;
  if (row) return row.id;
  return Number(
    db
      .prepare(
        `INSERT INTO sources (kind, name, url, terms_note, trust_weight)
         VALUES ('official_api', 'KOBIS', 'https://www.kobis.or.kr/kobisopenapi', '영화진흥위원회 오픈API — 약관 인용은 docs/90 항목 3', 1.0)`,
      )
      .run().lastInsertRowid,
  );
}

/** 동일 영화 탐지: kobis_code 우선, 다음 정규화 제목(±제작연도 타이브레이커). 복수 후보면 duplicate. */
export function findExistingMovie(
  db: DatabaseSync,
  m: NormalizedKobisMovie,
): { id: number; matchedBy: 'kobis_code' | 'title' } | { duplicate: true } | null {
  const byCode = db.prepare(`SELECT id FROM movies WHERE kobis_code = ?`).get(m.kobisCode) as
    | { id: number }
    | undefined;
  if (byCode) return { id: byCode.id, matchedBy: 'kobis_code' };

  const all = db
    .prepare(`SELECT id, title, original_title, kobis_code FROM movies`)
    .all() as { id: number; title: string; original_title: string | null; kobis_code: string | null }[];
  let candidates = all.filter(
    (r) => norm(r.title) === norm(m.title) || (m.titleEn && norm(r.original_title) === norm(m.titleEn)),
  );
  if (candidates.length > 1 && m.prodYear) {
    const byYear = candidates.filter((r) => {
      const year = (
        db.prepare(`SELECT release_date FROM movie_releases WHERE movie_id = ? LIMIT 1`).get(r.id) as
          | { release_date: string | null }
          | undefined
      )?.release_date;
      return year ? Math.abs(Number(year.slice(0, 4)) - m.prodYear!) <= 2 : true;
    });
    if (byYear.length === 1) candidates = byYear;
  }
  if (candidates.length === 1) return { id: candidates[0].id, matchedBy: 'title' };
  if (candidates.length > 1) return { duplicate: true };
  return null;
}

function promote(db: DatabaseSync, m: NormalizedKobisMovie, nowIso: string): 'created' | 'updated' | 'duplicate' {
  const existing = findExistingMovie(db, m);
  if (existing && 'duplicate' in existing) return 'duplicate';

  const sourceId = getOrCreateKobisSource(db);
  let movieId: number;
  let outcome: 'created' | 'updated';

  if (!existing) {
    movieId = Number(
      db
        .prepare(
          `INSERT INTO movies (title, original_title, runtime_min, rating, genres, director, kobis_code)
           VALUES (?,?,?,?,?,?,?)`,
        )
        .run(
          m.title,
          m.titleEn,
          m.runtimeMin,
          m.rating,
          JSON.stringify(m.genres),
          m.directors.join(', ') || null,
          m.kobisCode,
        ).lastInsertRowid,
    );
    outcome = 'created';
  } else {
    movieId = existing.id;
    // KOBIS가 공식 소스인 필드만 갱신 (기술 사양은 건드리지 않음)
    db.prepare(
      `UPDATE movies SET title=?, original_title=?, runtime_min=COALESCE(?, runtime_min),
        rating=COALESCE(?, rating), genres=?, director=COALESCE(?, director), kobis_code=? WHERE id=?`,
    ).run(
      m.title,
      m.titleEn,
      m.runtimeMin,
      m.rating,
      JSON.stringify(m.genres),
      m.directors.join(', ') || null,
      m.kobisCode,
      movieId,
    );
    outcome = 'updated';
  }

  if (m.openDate) {
    const status = m.openDate <= nowIso.slice(0, 10) ? 'domestic_release' : 'upcoming';
    db.prepare(
      `INSERT INTO movie_releases (movie_id, country, status, release_date, source_id, info_status, observed_at, confidence)
       VALUES (?,?,?,?,?,'official',?,1.0)
       ON CONFLICT (movie_id, country, release_date)
       DO UPDATE SET source_id=excluded.source_id, info_status='official', observed_at=excluded.observed_at, confidence=1.0`,
    ).run(movieId, 'KR', status, m.openDate, sourceId, nowIso);
  }

  // 포맷 버전: KOBIS 소스 분량만 교체 (다른 소스 레코드는 보존)
  db.prepare(`DELETE FROM movie_format_versions WHERE movie_id=? AND source_name='KOBIS'`).run(movieId);
  for (const f of m.formats) {
    db.prepare(
      `INSERT INTO movie_format_versions
        (movie_id, raw_value, normalized_value, source_type, source_name, info_status, observed_at)
       VALUES (?,?,?,?,?,?,?)`,
    ).run(movieId, f.raw, f.normalized, 'official_api', 'KOBIS', 'official', nowIso);
  }
  return outcome;
}

export function ingestNormalizedMovie(m: NormalizedKobisMovie, opts: SyncOptions = {}): SyncOutcome {
  const db = opts.db ?? getDb();
  const nowIso = (opts.now?.() ?? new Date()).toISOString();
  const log = opts.log ?? (() => {});
  const hash = hashOf(m);

  const prev = db
    .prepare(
      `SELECT data_hash, normalized FROM external_observations
       WHERE provider='kobis' AND external_id=? ORDER BY fetched_at DESC, id DESC LIMIT 1`,
    )
    .get(m.kobisCode) as { data_hash: string; normalized: string } | undefined;

  if (prev && prev.data_hash === hash) {
    if (!opts.dryRun) {
      db.prepare(
        `INSERT INTO external_observations (provider, external_id, entity_hint, fetched_at, data_hash, normalized, status)
         VALUES ('kobis',?,?,?,?,?,'unchanged')`,
      ).run(m.kobisCode, m.title, nowIso, hash, JSON.stringify(m));
    }
    log(`= [${m.kobisCode}] ${m.title} — 변경 없음`);
    return 'unchanged';
  }

  const diff = shallowDiff(prev ? (JSON.parse(prev.normalized) as NormalizedKobisMovie) : null, m);
  if (opts.dryRun) {
    const existing = findExistingMovie(db, m);
    const would = existing && 'duplicate' in existing ? 'duplicate' : existing ? 'updated' : 'created';
    log(`(dry-run) [${m.kobisCode}] ${m.title} → ${would}${diff ? ` (변경 필드: ${Object.keys(diff).join(',')})` : ''}`);
    return would;
  }

  db.exec('BEGIN');
  try {
    const obsId = Number(
      db
        .prepare(
          `INSERT INTO external_observations
             (provider, external_id, entity_hint, fetched_at, data_hash, normalized, raw_excerpt, status, diff)
           VALUES ('kobis',?,?,?,?,?,?, 'pending', ?)`,
        )
        .run(
          m.kobisCode,
          m.title,
          nowIso,
          hash,
          JSON.stringify(m),
          JSON.stringify({ formats: m.formats.map((f) => f.raw) }), // 최소 원문 발췌만
          diff ? JSON.stringify(diff) : null,
        ).lastInsertRowid,
    );

    const outcome = promote(db, m, nowIso);
    if (outcome === 'duplicate') {
      db.prepare(`UPDATE external_observations SET status='error', error=? WHERE id=?`).run(
        '동일 제목 복수 후보 — 수동 검수 필요',
        obsId,
      );
      db.exec('COMMIT');
      log(`? [${m.kobisCode}] ${m.title} — 중복 후보, 승격 보류`);
      return 'duplicate';
    }

    db.prepare(`UPDATE external_observations SET status='promoted', promoted_at=? WHERE id=?`).run(nowIso, obsId);
    db.exec('COMMIT');
    log(`${outcome === 'created' ? '+' : '~'} [${m.kobisCode}] ${m.title} — ${outcome}`);
    return outcome;
  } catch (e) {
    db.exec('ROLLBACK');
    log(`! [${m.kobisCode}] ${m.title} — 오류: ${e instanceof Error ? e.message : String(e)}`);
    return 'error';
  }
}

export async function syncMovieByCode(
  client: KobisClient,
  movieCd: string,
  opts: SyncOptions = {},
): Promise<SyncOutcome> {
  try {
    const res = await client.movieInfo(movieCd);
    return ingestNormalizedMovie(mapMovieInfo(res), opts);
  } catch (e) {
    (opts.log ?? (() => {}))(
      `! [${movieCd}] 조회 실패: ${e instanceof KobisError ? e.message : '알 수 없는 오류'}`,
    );
    return 'error';
  }
}

export async function syncBoxOfficeDate(
  client: KobisClient,
  targetDt: string,
  opts: SyncOptions = {},
): Promise<SyncCounts> {
  const counts: SyncCounts = { fetched: 0, created: 0, updated: 0, unchanged: 0, errors: 0, duplicates: 0 };
  const list = mapBoxOffice(await client.dailyBoxOffice(targetDt));
  counts.fetched = list.length;
  for (const entry of list) {
    const outcome = await syncMovieByCode(client, entry.kobisCode, opts);
    if (outcome === 'created') counts.created++;
    else if (outcome === 'updated') counts.updated++;
    else if (outcome === 'unchanged') counts.unchanged++;
    else if (outcome === 'duplicate') counts.duplicates++;
    else counts.errors++;
  }
  return counts;
}
