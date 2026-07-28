// 관리자 품질 대시보드용 집계 — 순수 조회 전용, 어떤 것도 쓰지 않는다.
import { computeAuditoriumCompleteness, type CompletenessLevel } from '../domain/dataQuality/completeness';
import { getAppClock } from '../lib/clock';
import { getAppDbClient } from './client/index';
import type { DbClient } from './client/types';

export interface AuditoriumQualityRow {
  auditoriumId: number;
  locationName: string;
  auditoriumNo: string;
  brand: string;
  regionCode: string | null;
  level: CompletenessLevel;
  missing: string[];
}

export interface MovieSpecStats {
  totalMovies: number;
  moviesWithVerifiedSpec: number; // movie_technical_specs에 official/multi_source 행이 하나라도 있는 영화 수
}

export interface ShowtimeStats {
  activeCount: number;
  syntheticCount: number;
}

export interface RecentRunStats {
  totalRuns: number;
  noResultsCount: number; // scored가 빈 배열인 실행 수
  lowConfidenceCandidateRate: number | null; // scored 후보 중 confidenceLabel '낮음' 비율 (후보가 하나도 없으면 null)
}

const RECENT_RUN_LIMIT = 200;

export function createDataQualityRepository(getDb: () => DbClient) {
  return {
    async getAuditoriumQuality(now: Date = getAppClock().now()): Promise<AuditoriumQualityRow[]> {
      const db = getDb();
      const auditoriums = await db.query<{
        id: number;
        auditorium_no: string;
        brand: string;
        location_name: string;
        region_code: string | null;
      }>(
        `SELECT a.id, a.auditorium_no, a.brand, l.name AS location_name, l.region_code
         FROM auditoriums a JOIN cinema_locations l ON l.id = a.location_id
         WHERE a.status = 'operating'
         ORDER BY l.name, a.auditorium_no`,
      );
      const specs = await db.query<{
        auditorium_id: number;
        projector: string | null;
        screen: string | null;
        sound: string | null;
        supported_ar: string | null;
        source_id: number | null;
        observed_at: string;
      }>(
        `SELECT auditorium_id, projector, screen, sound, supported_ar, source_id, observed_at
         FROM auditorium_specs WHERE valid_to IS NULL`,
      );
      const specByAuditorium = new Map(specs.map((s) => [s.auditorium_id, s]));

      const seatZoneCounts = await db.query<{ auditorium_id: number; n: number }>(
        `SELECT auditorium_id, COUNT(*) AS n FROM seat_zones WHERE is_active = 1 GROUP BY auditorium_id`,
      );
      const seatZoneByAuditorium = new Map(seatZoneCounts.map((r) => [r.auditorium_id, r.n]));

      const showtimeCounts = await db.query<{ auditorium_id: number; n: number }>(
        `SELECT auditorium_id, COUNT(*) AS n FROM showtimes WHERE status = 'active' GROUP BY auditorium_id`,
      );
      const showtimeByAuditorium = new Map(showtimeCounts.map((r) => [r.auditorium_id, r.n]));

      return auditoriums.map((a): AuditoriumQualityRow => {
        const spec = specByAuditorium.get(a.id);
        const result = computeAuditoriumCompleteness({
          hasCurrentSpec: !!spec,
          hasProjector: !!spec?.projector,
          hasScreen: !!spec?.screen,
          hasSound: !!spec?.sound,
          hasSupportedAr: !!spec?.supported_ar,
          hasSeatZone: (seatZoneByAuditorium.get(a.id) ?? 0) > 0,
          hasSource: !!spec?.source_id,
          hasActiveShowtime: (showtimeByAuditorium.get(a.id) ?? 0) > 0,
          specObservedAt: spec?.observed_at ?? null,
          now,
        });
        return {
          auditoriumId: a.id,
          locationName: a.location_name,
          auditoriumNo: a.auditorium_no,
          brand: a.brand,
          regionCode: a.region_code,
          level: result.level,
          missing: result.missing,
        };
      });
    },

    async getMovieSpecStats(): Promise<MovieSpecStats> {
      const db = getDb();
      const [{ n: totalMovies }] = await db.query<{ n: number }>(`SELECT COUNT(*) AS n FROM movies`);
      const [{ n: moviesWithVerifiedSpec }] = await db.query<{ n: number }>(
        `SELECT COUNT(DISTINCT movie_id) AS n FROM movie_technical_specs
         WHERE info_status IN ('official','multi_source')`,
      );
      return { totalMovies, moviesWithVerifiedSpec };
    },

    async getShowtimeStats(): Promise<ShowtimeStats> {
      const db = getDb();
      const [{ n: activeCount }] = await db.query<{ n: number }>(
        `SELECT COUNT(*) AS n FROM showtimes WHERE status = 'active'`,
      );
      const [{ n: syntheticCount }] = await db.query<{ n: number }>(
        `SELECT COUNT(*) AS n FROM showtimes WHERE status = 'active' AND is_synthetic = 1`,
      );
      return { activeCount, syntheticCount };
    },

    async getRecentRunStats(limit = RECENT_RUN_LIMIT): Promise<RecentRunStats> {
      const db = getDb();
      const rows = await db.query<{ results: string | null }>(
        `SELECT results FROM recommendation_runs ORDER BY id DESC LIMIT ?`,
        [limit],
      );
      let noResultsCount = 0;
      let lowConfidenceCandidates = 0;
      let totalCandidates = 0;
      for (const row of rows) {
        const scored = row.results ? (JSON.parse(row.results) as { confidenceLabel: string }[]) : [];
        if (scored.length === 0) noResultsCount += 1;
        totalCandidates += scored.length;
        lowConfidenceCandidates += scored.filter((s) => s.confidenceLabel === '낮음').length;
      }
      return {
        totalRuns: rows.length,
        noResultsCount,
        lowConfidenceCandidateRate: totalCandidates > 0 ? lowConfidenceCandidates / totalCandidates : null,
      };
    },
  };
}

export const dataQualityRepository = createDataQualityRepository(getAppDbClient);
