import type { InfoStatus, MovieSpecKey, MovieWithSpecs, SpecValue } from '../domain/recommendation/types';
import { getDb } from './db';

interface MovieRow {
  id: number;
  title: string;
  original_title: string | null;
  runtime_min: number;
  rating: string | null;
  genres: string | null;
  director: string | null;
  release_date: string | null;
  release_status: string | null;
}

interface SpecRow {
  spec_key: string;
  value: string;
  info_status: InfoStatus;
  observed_at: string;
  confidence: number;
  source_name: string | null;
  source_url: string | null;
}

interface FormatVersionRow {
  raw_value: string;
  normalized_value: string | null;
  source_name: string;
  info_status: InfoStatus;
  observed_at: string;
  verified_at: string | null;
}

// 공식 포맷 버전(movie_format_versions, KOBIS 동기화 결과)이 있으면 레거시 시드 스펙보다 우선.
// KOBIS showTypes는 "등록된 상영 형태" 사실만 의미 — 기술 사양으로 확대 해석하지 않는다.
function loadFormatVersions(movieId: number): SpecValue | null {
  const rows = getDb()
    .prepare(
      `SELECT raw_value, normalized_value, source_name, info_status, observed_at, verified_at
       FROM movie_format_versions WHERE movie_id = ? ORDER BY id`,
    )
    .all(movieId) as unknown as FormatVersionRow[];
  if (!rows.length) return null;
  const normalized = [...new Set(rows.map((r) => r.normalized_value).filter((v): v is string => !!v))];
  return {
    value: normalized,
    infoStatus: rows[0].info_status,
    observedAt: rows.reduce((max, r) => (r.observed_at > max ? r.observed_at : max), rows[0].observed_at).slice(0, 10),
    confidence: 1.0,
    sourceName: rows[0].source_name,
    sourceUrl: rows[0].source_name === 'KOBIS' ? 'https://www.kobis.or.kr/kobisopenapi' : null,
  };
}

function loadSpecs(movieId: number): Partial<Record<MovieSpecKey, SpecValue>> {
  const rows = getDb()
    .prepare(
      `SELECT s.spec_key, s.value, s.info_status, s.observed_at, s.confidence,
              src.name AS source_name, src.url AS source_url
       FROM movie_technical_specs s
       LEFT JOIN sources src ON src.id = s.source_id
       WHERE s.movie_id = ?
       ORDER BY s.confidence DESC, s.observed_at DESC`,
    )
    .all(movieId) as unknown as SpecRow[];

  // 대표값: spec_key당 최고 신뢰 레코드 (문서 06 §4 축소)
  const specs: Partial<Record<MovieSpecKey, SpecValue>> = {};
  for (const r of rows) {
    const key = r.spec_key as MovieSpecKey;
    if (!specs[key]) {
      specs[key] = {
        value: JSON.parse(r.value),
        infoStatus: r.info_status,
        observedAt: r.observed_at,
        confidence: r.confidence,
        sourceName: r.source_name,
        sourceUrl: r.source_url,
      };
    }
  }
  const official = loadFormatVersions(movieId);
  if (official) specs.format_versions = official;
  return specs;
}

function toMovie(row: MovieRow): MovieWithSpecs {
  return {
    id: row.id,
    title: row.title,
    originalTitle: row.original_title,
    runtimeMin: row.runtime_min,
    rating: row.rating,
    genres: row.genres ? (JSON.parse(row.genres) as string[]) : [],
    director: row.director,
    releaseYear: row.release_date ? Number(row.release_date.slice(0, 4)) : null,
    releaseStatus: row.release_status,
    specs: loadSpecs(row.id),
  };
}

// 복수 개봉(재개봉 포함) 시 최초 개봉일 기준 — JOIN 중복 행 방지를 위해 스칼라 서브쿼리 사용
const MOVIE_SELECT = `
  SELECT m.id, m.title, m.original_title, m.runtime_min, m.rating, m.genres, m.director,
         (SELECT MIN(release_date) FROM movie_releases WHERE movie_id = m.id) AS release_date,
         (SELECT status FROM movie_releases WHERE movie_id = m.id ORDER BY release_date LIMIT 1) AS release_status
  FROM movies m`;

export const movieRepository = {
  list(): MovieWithSpecs[] {
    const rows = getDb().prepare(`${MOVIE_SELECT} ORDER BY m.id`).all() as unknown as MovieRow[];
    return rows.map(toMovie);
  },

  findById(id: number): MovieWithSpecs | null {
    const row = getDb().prepare(`${MOVIE_SELECT} WHERE m.id = ?`).get(id) as unknown as
      | MovieRow
      | undefined;
    return row ? toMovie(row) : null;
  },
};
