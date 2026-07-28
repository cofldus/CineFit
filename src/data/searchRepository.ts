// 영화·상영관 검색 — 제목/원제/별칭/상영관명/체인/지역코드 단순 텍스트 매칭만 한다(LLM 검색 아님).
import { getAppDbClient } from './client/index';
import type { DbClient } from './client/types';

export interface MovieSearchResult {
  id: number;
  title: string;
  originalTitle: string | null;
  matchedAlias: string | null;
}

export interface CinemaSearchResult {
  auditoriumId: number;
  label: string; // "CGV 용산아이파크몰 IMAX관"
  brand: string;
  locationName: string;
  regionCode: string | null;
  matchedAlias: string | null;
}

export interface SearchResults {
  movies: MovieSearchResult[];
  cinemas: CinemaSearchResult[];
}

const EMPTY_RESULTS: SearchResults = { movies: [], cinemas: [] };

export function createSearchRepository(getDb: () => DbClient) {
  return {
    async search(rawQuery: string): Promise<SearchResults> {
      const query = rawQuery.trim();
      if (!query) return EMPTY_RESULTS;
      const like = `%${query}%`;
      const db = getDb();

      const movieRows = await db.query<{
        id: number;
        title: string;
        original_title: string | null;
        matched_alias: string | null;
      }>(
        `SELECT DISTINCT m.id, m.title, m.original_title,
                (SELECT alias FROM movie_aliases WHERE movie_id = m.id AND alias LIKE ? LIMIT 1) AS matched_alias
         FROM movies m
         LEFT JOIN movie_aliases ma ON ma.movie_id = m.id
         WHERE m.title LIKE ? OR m.original_title LIKE ? OR ma.alias LIKE ?
         ORDER BY m.title`,
        [like, like, like, like],
      );

      const cinemaRows = await db.query<{
        auditorium_id: number;
        auditorium_no: string;
        brand: string;
        location_name: string;
        region_code: string | null;
        matched_alias: string | null;
      }>(
        `SELECT DISTINCT a.id AS auditorium_id, a.auditorium_no, a.brand,
                l.name AS location_name, l.region_code,
                (SELECT alias FROM auditorium_aliases WHERE auditorium_id = a.id AND alias LIKE ? LIMIT 1) AS matched_alias
         FROM auditoriums a
         JOIN cinema_locations l ON l.id = a.location_id
         LEFT JOIN auditorium_aliases aa ON aa.auditorium_id = a.id
         WHERE l.name LIKE ? OR l.chain LIKE ? OR l.region_code LIKE ? OR aa.alias LIKE ?
         ORDER BY l.name, a.auditorium_no`,
        [like, like, like, like, like],
      );

      return {
        movies: movieRows.map((r) => ({
          id: r.id,
          title: r.title,
          originalTitle: r.original_title,
          matchedAlias: r.matched_alias,
        })),
        cinemas: cinemaRows.map((r) => ({
          auditoriumId: r.auditorium_id,
          label: `${r.location_name} ${r.auditorium_no}`,
          brand: r.brand,
          locationName: r.location_name,
          regionCode: r.region_code,
          matchedAlias: r.matched_alias,
        })),
      };
    },
  };
}

export const searchRepository = createSearchRepository(getAppDbClient);
