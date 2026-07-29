// KMDb 동기화 — kobisSyncService.ts와 동일한 불변 관찰 로그 패턴을 쓴다.
// 흐름: KMDb 응답 → 정규화 → external_observations 기록 → 줄거리·기술 필드 승격.
// 식별자 연결(어느 KOBIS 영화가 어느 KMDb DOCID인지 결정하는 일)은 이 파일의 책임이 아니다
// — movies.kmdb_docid가 이미 채워져 있다고 전제한다(연결 자체는 문서 IDENTIFIER-LINKAGE.md).
//
// 기술 필드(kmdb_screen_area 등)는 항상 KMDb 전용 source_id로만 UPSERT한다 — 다른 출처의
// movie_technical_specs 행은 절대 건드리지 않으므로 "충돌"이 애초에 발생하지 않는다. 대신
// info_status를 항상 'single_unverified'로 남겨(KMDb 단독, 교차검증 안 됨) 화면에서 공식
// 확정값과 자동으로 구분되게 한다 — 관리자가 필요하면 별도로 큐레이션 vocabulary(native_ar 등)
// 승격 여부를 판단한다.
import { createHash } from 'node:crypto';
import { getAppDbClient } from '../../client/index.ts';
import type { DbClient } from '../../client/types.ts';
import { KmdbClient, KmdbError } from './kmdbClient.ts';
import { findResultByDocId, mapSearchResult } from './kmdbMapper.ts';
import type { KmdbSyncOutcome, NormalizedKmdbMovie } from './kmdbTypes.ts';

export interface KmdbSyncOptions {
  dryRun?: boolean;
  now?: () => Date;
  log?: (message: string) => void;
  db?: DbClient;
}

const KMDB_SPEC_KEY: Record<NormalizedKmdbMovie['technicalFields'][number]['key'], string> = {
  screen_area: 'kmdb_screen_area',
  sound_echo: 'kmdb_sound_echo',
  f_sound: 'kmdb_f_sound',
};

function hashOf(m: NormalizedKmdbMovie): string {
  return createHash('sha256').update(JSON.stringify(m)).digest('hex');
}

async function getOrCreateKmdbSource(db: DbClient): Promise<number> {
  const rows = await db.query<{ id: number }>(`SELECT id FROM sources WHERE name = 'KMDb'`);
  if (rows[0]) return rows[0].id;
  const inserted = await db.query<{ id: number }>(
    `INSERT INTO sources (kind, name, url, terms_note, trust_weight)
     VALUES ('official_api', 'KMDb', 'https://www.kmdb.or.kr/info/api/apiList',
       '한국영상자료원 오픈API — 첫 연동이라 기술 필드(screenArea 등) 정확도를 아직 교차검증하지
        않아 KOBIS(1.0)보다 보수적으로 설정함(docs/KMDB-INTEGRATION.md)', 0.9)
     RETURNING id`,
  );
  return inserted[0].id;
}

async function promotePlotAndTechnicalFields(
  db: DbClient,
  movieId: number,
  m: NormalizedKmdbMovie,
  sourceId: number,
  nowIso: string,
): Promise<number> {
  let promoted = 0;

  if (m.plotSummary) {
    await db.run(
      `INSERT INTO observations (entity_type, entity_id, field, value, source_id, observed_at, info_status, confidence)
       VALUES ('movie', ?, 'plot_summary', ?, ?, ?, 'official', 0.9)`,
      [movieId, JSON.stringify(m.plotSummary), sourceId, nowIso],
    );
  }

  for (const f of m.technicalFields) {
    const specKey = KMDB_SPEC_KEY[f.key];
    await db.run(
      `INSERT INTO movie_technical_specs (movie_id, spec_key, value, source_id, info_status, observed_at, confidence)
       VALUES (?,?,?,?, 'single_unverified', ?, 0.4)
       ON CONFLICT (movie_id, spec_key, source_id)
       DO UPDATE SET value = excluded.value, observed_at = excluded.observed_at`,
      [movieId, specKey, JSON.stringify(f.rawValue), sourceId, nowIso],
    );
    promoted++;
  }
  return promoted;
}

/** movies.kmdb_docid로 이미 연결된 영화의 KMDb 데이터를 동기화한다. */
export async function syncLinkedMovie(
  client: KmdbClient,
  movieId: number,
  opts: KmdbSyncOptions = {},
): Promise<KmdbSyncOutcome> {
  const db = opts.db ?? getAppDbClient();
  const nowIso = (opts.now?.() ?? new Date()).toISOString();
  const log = opts.log ?? (() => {});

  const movie = (
    await db.query<{ id: number; title: string; kmdb_docid: string | null }>(
      `SELECT id, title, kmdb_docid FROM movies WHERE id = ?`,
      [movieId],
    )
  )[0];
  if (!movie) return { outcome: 'error', reason: '존재하지 않는 영화입니다.' };
  if (!movie.kmdb_docid) {
    return { outcome: 'error', reason: 'KMDb 식별자 연결이 아직 없습니다(먼저 식별자 연결 필요).' };
  }

  let res;
  try {
    res = await client.searchByTitle(movie.title, { listCount: 20 });
  } catch (e) {
    const reason = e instanceof KmdbError ? e.message : '알 수 없는 오류';
    log(`! [${movie.title}] KMDb 검색 실패: ${reason}`);
    return { outcome: 'error', reason };
  }

  const matched = findResultByDocId(res, movie.kmdb_docid);
  if (!matched) {
    const reason = `검색 결과에서 연결된 DOCID(${movie.kmdb_docid})를 찾지 못했습니다.`;
    log(`? [${movie.title}] ${reason}`);
    return { outcome: 'error', reason };
  }

  const normalized = mapSearchResult(matched);
  const hash = hashOf(normalized);

  const prev = (
    await db.query<{ data_hash: string }>(
      `SELECT data_hash FROM external_observations
       WHERE provider='kmdb' AND external_id=? ORDER BY fetched_at DESC, id DESC LIMIT 1`,
      [normalized.docId],
    )
  )[0];

  if (prev && prev.data_hash === hash) {
    if (!opts.dryRun) {
      await db.run(
        `INSERT INTO external_observations (provider, external_id, entity_hint, fetched_at, data_hash, normalized, status, created_at)
         VALUES ('kmdb',?,?,?,?,?,'unchanged',?)`,
        [normalized.docId, movie.title, nowIso, hash, JSON.stringify(normalized), nowIso],
      );
    }
    log(`= [DOCID ${normalized.docId}] ${movie.title} — 변경 없음`);
    return { outcome: 'unchanged' };
  }

  if (opts.dryRun) {
    log(
      `(dry-run) [DOCID ${normalized.docId}] ${movie.title} → 기술 필드 ${normalized.technicalFields.length}건, 줄거리 ${normalized.plotSummary ? '있음' : '없음'}`,
    );
    return { outcome: 'dry_run', wouldPromote: normalized.technicalFields.length };
  }

  return db.transaction(async (tx) => {
    await tx.run(
      `INSERT INTO external_observations
         (provider, external_id, entity_hint, fetched_at, data_hash, normalized, raw_excerpt, status, created_at)
       VALUES ('kmdb',?,?,?,?,?,?, 'promoted', ?)`,
      [
        normalized.docId,
        movie.title,
        nowIso,
        hash,
        JSON.stringify(normalized),
        JSON.stringify({ technicalFields: normalized.technicalFields.map((f) => f.key) }),
        nowIso,
      ],
    );
    const sourceId = await getOrCreateKmdbSource(tx);
    const specsPromoted = await promotePlotAndTechnicalFields(tx, movieId, normalized, sourceId, nowIso);
    log(`+ [DOCID ${normalized.docId}] ${movie.title} — 기술 필드 ${specsPromoted}건 반영`);
    return { outcome: 'promoted', specsPromoted } as const;
  });
}
