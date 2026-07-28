import type { InfoStatus, SeatZone } from '../domain/recommendation/types';
import { getDb } from './db';

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
  };
}

export const seatZoneRepository = {
  /** 여러 상영관의 좌석 존을 한 번에 조회 (auditorium_id → zones) */
  listByAuditoriums(auditoriumIds: number[]): Map<number, SeatZone[]> {
    const map = new Map<number, SeatZone[]>();
    if (!auditoriumIds.length) return map;
    const placeholders = auditoriumIds.map(() => '?').join(',');
    const rows = getDb()
      .prepare(
        `SELECT z.auditorium_id, z.purpose, z.row_range, z.col_range, z.rationale,
                z.info_status, z.observed_at, z.confidence, s.name AS source_name
         FROM seat_zones z LEFT JOIN sources s ON s.id = z.source_id
         WHERE z.auditorium_id IN (${placeholders})
         ORDER BY z.confidence DESC`,
      )
      .all(...auditoriumIds) as unknown as SeatZoneRow[];
    for (const r of rows) {
      const list = map.get(r.auditorium_id) ?? [];
      list.push(toZone(r));
      map.set(r.auditorium_id, list);
    }
    return map;
  },

  listByAuditorium(auditoriumId: number): SeatZone[] {
    return this.listByAuditoriums([auditoriumId]).get(auditoriumId) ?? [];
  },
};
