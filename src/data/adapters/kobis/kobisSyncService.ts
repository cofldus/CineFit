// KOBIS 동기화 — 불변 관찰 로그를 거쳐 핵심 테이블로 승격한다.
// 흐름: KOBIS 응답 → 정규화 → external_observations 기록 → (해시 비교) → movies/releases/format_versions 승격
// 핵심 테이블을 직접 덮어쓰지 않으며, 동일 해시 재수신 시 승격을 건너뛴다.
// DbClient 기반 — SQLite·PostgreSQL 동일 동작.
import { createHash } from 'node:crypto';
import { getAppDbClient } from '../../client/index.ts';
import type { DbClient } from '../../client/types.ts';
import { KobisClient, KobisError } from './kobisClient.ts';
import { mapBoxOffice, mapMovieInfo } from './kobisMapper.ts';
import type { NormalizedKobisMovie, SyncCounts } from './kobisTypes.ts';

export type SyncOutcome = 'created' | 'updated' | 'unchanged' | 'duplicate' | 'error';

export interface SyncOptions {
  dryRun?: boolean;
  now?: () => Date;
  log?: (message: string) => void;
  db?: DbClient; // 테스트 주입
}

const norm = (s: string | null | undefined) => (s ?? '').replace(/[\s:·,\-–—!?.]/g, '').toLowerCase();

function hashOf(m: NormalizedKobisMovie): string {
  return createHash('sha256').update(JSON.stringify(m)).digest('hex');
}

function shallowDiff(prev: NormalizedKobisMovie | null, next: NormalizedKobisMovie) {
  if (!prev) return null;
  const diff: Record<string, { before: unknown; after: unknown }> = {};
  for (const key of Object.keys(next) as (keyof NormalizedKobisMovie)[]) {
    if (JSON.stringify(prev[key]) !== JSON.stringify(next[key]))
      diff[key] = { before: prev[key], after: next[key] };
  }
  return Object.keys(diff).length ? diff : null;
}

async function getOrCreateKobisSource(db: DbClient): Promise<number> {
  const rows = await db.query<{ id: number }>(`SELECT id FROM sources WHERE name = 'KOBIS'`);
  if (rows[0]) return rows[0].id;
  const inserted = await db.query<{ id: number }>(
    `INSERT INTO sources (kind, name, url, terms_note, trust_weight)
     VALUES ('official_api', 'KOBIS', 'https://www.kobis.or.kr/kobisopenapi', '영화진흥위원회 오픈API — 약관 인용은 docs/90 항목 3', 1.0)
     RETURNING id`,
  );
  return inserted[0].id;
}

/** 동일 영화 탐지: kobis_code 우선, 다음 정규화 제목(±제작연도 타이브레이커). 복수 후보면 duplicate. */
export async function findExistingMovie(
  db: DbClient,
  m: NormalizedKobisMovie,
): Promise<{ id: number; matchedBy: 'kobis_code' | 'title' } | { duplicate: true } | null> {
  const byCode = await db.query<{ id: number }>(`SELECT id FROM movies WHERE kobis_code = ?`, [m.kobisCode]);
  if (byCode[0]) return { id: byCode[0].id, matchedBy: 'kobis_code' };

  const all = await db.query<{ id: number; title: string; original_title: string | null }>(
    `SELECT id, title, original_title FROM movies`,
  );
  let candidates = all.filter(
    (r) => norm(r.title) === norm(m.title) || (m.titleEn && norm(r.original_title) === norm(m.titleEn)),
  );
  if (candidates.length > 1 && m.prodYear) {
    const filtered: typeof candidates = [];
    for (const r of candidates) {
      const rel = await db.query<{ release_date: string | null }>(
        `SELECT release_date FROM movie_releases WHERE movie_id = ? LIMIT 1`,
        [r.id],
      );
      const year = rel[0]?.release_date;
      if (!year || Math.abs(Number(year.slice(0, 4)) - m.prodYear) <= 2) filtered.push(r);
    }
    if (filtered.length === 1) candidates = filtered;
  }
  if (candidates.length === 1) return { id: candidates[0].id, matchedBy: 'title' };
  if (candidates.length > 1) return { duplicate: true };
  return null;
}

async function promote(
  db: DbClient,
  m: NormalizedKobisMovie,
  nowIso: string,
): Promise<'created' | 'updated' | 'duplicate'> {
  const existing = await findExistingMovie(db, m);
  if (existing && 'duplicate' in existing) return 'duplicate';

  const sourceId = await getOrCreateKobisSource(db);
  let movieId: number;
  let outcome: 'created' | 'updated';

  if (!existing) {
    const rows = await db.query<{ id: number }>(
      `INSERT INTO movies (title, original_title, runtime_min, rating, genres, director, kobis_code, created_at)
       VALUES (?,?,?,?,?,?,?,?) RETURNING id`,
      [
        m.title,
        m.titleEn,
        m.runtimeMin,
        m.rating,
        JSON.stringify(m.genres),
        m.directors.join(', ') || null,
        m.kobisCode,
        nowIso,
      ],
    );
    movieId = rows[0].id;
    outcome = 'created';
  } else {
    movieId = existing.id;
    // KOBIS가 공식 소스인 필드만 갱신 (기술 사양은 건드리지 않음)
    await db.run(
      `UPDATE movies SET title=?, original_title=?, runtime_min=COALESCE(?, runtime_min),
        rating=COALESCE(?, rating), genres=?, director=COALESCE(?, director), kobis_code=? WHERE id=?`,
      [
        m.title,
        m.titleEn,
        m.runtimeMin,
        m.rating,
        JSON.stringify(m.genres),
        m.directors.join(', ') || null,
        m.kobisCode,
        movieId,
      ],
    );
    outcome = 'updated';
  }

  if (m.openDate) {
    const status = m.openDate <= nowIso.slice(0, 10) ? 'domestic_release' : 'upcoming';
    await db.run(
      `INSERT INTO movie_releases (movie_id, country, status, release_date, source_id, info_status, observed_at, confidence)
       VALUES (?,?,?,?,?,'official',?,1.0)
       ON CONFLICT (movie_id, country, release_date)
       DO UPDATE SET source_id=excluded.source_id, info_status='official', observed_at=excluded.observed_at, confidence=1.0`,
      [movieId, 'KR', status, m.openDate, sourceId, nowIso],
    );
  }

  // 포맷 버전: KOBIS 소스 분량만 교체 (다른 소스 레코드는 보존)
  await db.run(`DELETE FROM movie_format_versions WHERE movie_id=? AND source_name='KOBIS'`, [movieId]);
  for (const f of m.formats) {
    await db.run(
      `INSERT INTO movie_format_versions
        (movie_id, raw_value, normalized_value, source_type, source_name, info_status, observed_at)
       VALUES (?,?,?,?,?,?,?)`,
      [movieId, f.raw, f.normalized, 'official_api', 'KOBIS', 'official', nowIso],
    );
  }
  return outcome;
}

export async function ingestNormalizedMovie(m: NormalizedKobisMovie, opts: SyncOptions = {}): Promise<SyncOutcome> {
  const db = opts.db ?? getAppDbClient();
  const nowIso = (opts.now?.() ?? new Date()).toISOString();
  const log = opts.log ?? (() => {});
  const hash = hashOf(m);

  const prev = (
    await db.query<{ data_hash: string; normalized: string }>(
      `SELECT data_hash, normalized FROM external_observations
       WHERE provider='kobis' AND external_id=? ORDER BY fetched_at DESC, id DESC LIMIT 1`,
      [m.kobisCode],
    )
  )[0];

  if (prev && prev.data_hash === hash) {
    if (!opts.dryRun) {
      await db.run(
        `INSERT INTO external_observations (provider, external_id, entity_hint, fetched_at, data_hash, normalized, status, created_at)
         VALUES ('kobis',?,?,?,?,?,'unchanged',?)`,
        [m.kobisCode, m.title, nowIso, hash, JSON.stringify(m), nowIso],
      );
    }
    log(`= [${m.kobisCode}] ${m.title} — 변경 없음`);
    return 'unchanged';
  }

  const diff = shallowDiff(prev ? (JSON.parse(prev.normalized) as NormalizedKobisMovie) : null, m);
  if (opts.dryRun) {
    const existing = await findExistingMovie(db, m);
    const would = existing && 'duplicate' in existing ? 'duplicate' : existing ? 'updated' : 'created';
    log(
      `(dry-run) [${m.kobisCode}] ${m.title} → ${would}${diff ? ` (변경 필드: ${Object.keys(diff).join(',')})` : ''}`,
    );
    return would;
  }

  try {
    return await db.transaction(async (tx) => {
      const obsRows = await tx.query<{ id: number }>(
        `INSERT INTO external_observations
           (provider, external_id, entity_hint, fetched_at, data_hash, normalized, raw_excerpt, status, diff, created_at)
         VALUES ('kobis',?,?,?,?,?,?, 'pending', ?, ?) RETURNING id`,
        [
          m.kobisCode,
          m.title,
          nowIso,
          hash,
          JSON.stringify(m),
          JSON.stringify({ formats: m.formats.map((f) => f.raw) }), // 최소 원문 발췌만
          diff ? JSON.stringify(diff) : null,
          nowIso,
        ],
      );
      const obsId = obsRows[0].id;

      const outcome = await promote(tx, m, nowIso);
      if (outcome === 'duplicate') {
        await tx.run(`UPDATE external_observations SET status='error', error=? WHERE id=?`, [
          '동일 제목 복수 후보 — 수동 검수 필요',
          obsId,
        ]);
        log(`? [${m.kobisCode}] ${m.title} — 중복 후보, 승격 보류`);
        return 'duplicate';
      }

      await tx.run(`UPDATE external_observations SET status='promoted', promoted_at=? WHERE id=?`, [nowIso, obsId]);
      log(`${outcome === 'created' ? '+' : '~'} [${m.kobisCode}] ${m.title} — ${outcome}`);
      return outcome;
    });
  } catch (e) {
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
    return await ingestNormalizedMovie(mapMovieInfo(res), opts);
  } catch (e) {
    (opts.log ?? (() => {}))(`! [${movieCd}] 조회 실패: ${e instanceof KobisError ? e.message : '알 수 없는 오류'}`);
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
