import type { InfoStatus, SeatZone } from '../domain/recommendation/types';
import { getAppDbClient } from './client/index';
import type { DbClient } from './client/types';

interface SeatZoneRow {
  auditorium_id: number;
  purpose: string;
  row_range: string | null;
  col_range: string | null;
  rationale: string | null;
  info_status: InfoStatus;
  observed_at: string;
  confidence: number;
  source_name: string | null;
  reviewed_at: string | null;
  valid_from: string | null;
  supersedes_seat_zone_id: number | null;
}

function toZone(r: SeatZoneRow): SeatZone {
  return {
    purposes: JSON.parse(r.purpose) as string[],
    rowRange: r.row_range,
    colRange: r.col_range,
    rationale: r.rationale,
    infoStatus: r.info_status,
    observedAt: r.observed_at,
    confidence: r.confidence,
    sourceName: r.source_name,
    reviewedAt: r.reviewed_at,
    validFrom: r.valid_from,
    supersedesSeatZoneId: r.supersedes_seat_zone_id,
  };
}

export function createSeatZoneRepository(getDb: () => DbClient) {
  return {
    /** 여러 상영관의 좌석 존을 한 번에 조회 (auditorium_id → zones) */
    async listByAuditoriums(auditoriumIds: number[]): Promise<Map<number, SeatZone[]>> {
      const map = new Map<number, SeatZone[]>();
      if (!auditoriumIds.length) return map;
      const placeholders = auditoriumIds.map(() => '?').join(',');
      const rows = await getDb().query<SeatZoneRow>(
        `SELECT z.auditorium_id, z.purpose, z.row_range, z.col_range, z.rationale,
                z.info_status, z.observed_at, z.confidence, s.name AS source_name,
                z.reviewed_at, z.valid_from, z.supersedes_seat_zone_id
         FROM seat_zones z LEFT JOIN sources s ON s.id = z.source_id
         WHERE z.auditorium_id IN (${placeholders}) AND z.is_active = 1
         ORDER BY z.confidence DESC`,
        auditoriumIds,
      );
      for (const r of rows) {
        const list = map.get(r.auditorium_id) ?? [];
        list.push(toZone(r));
        map.set(r.auditorium_id, list);
      }
      return map;
    },

    async listByAuditorium(auditoriumId: number): Promise<SeatZone[]> {
      return (await this.listByAuditoriums([auditoriumId])).get(auditoriumId) ?? [];
    },

    /** 관리자 화면용 — 활성 존을 id 포함으로 조회 (supersedes 대상 선택) */
    async listActiveForAdmin(
      auditoriumId: number,
    ): Promise<Array<{ id: number; purposes: string[]; rowRange: string | null; colRange: string | null; confidence: number }>> {
      const rows = await getDb().query<{
        id: number;
        purpose: string;
        row_range: string | null;
        col_range: string | null;
        confidence: number;
      }>(
        `SELECT id, purpose, row_range, col_range, confidence FROM seat_zones
         WHERE auditorium_id = ? AND is_active = 1 ORDER BY confidence DESC`,
        [auditoriumId],
      );
      return rows.map((r) => ({
        id: r.id,
        purposes: JSON.parse(r.purpose) as string[],
        rowRange: r.row_range,
        colRange: r.col_range,
        confidence: r.confidence,
      }));
    },
  };
}

export const seatZoneRepository = createSeatZoneRepository(getAppDbClient);
