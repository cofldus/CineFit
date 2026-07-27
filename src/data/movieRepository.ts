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

const MOVIE_SELECT = `
  SELECT m.id, m.title, m.original_title, m.runtime_min, m.rating, m.genres, m.director,
         r.release_date, r.status AS release_status
  FROM movies m
  LEFT JOIN movie_releases r ON r.movie_id = m.id`;

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
