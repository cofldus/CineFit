import type { AuditoriumSpec, InfoStatus, SeatZone } from '../domain/recommendation/types';
import { getAppDbClient } from './client/index';
import type { DbClient } from './client/types';
import { createSeatZoneRepository } from './seatZoneRepository';

export interface AuditoriumSpecHistory extends AuditoriumSpec {
  validFrom: string;
  validTo: string | null;
}

export interface AuditoriumObservation {
  field: string;
  value: unknown;
  sourceName: string | null;
  observedAt: string;
  infoStatus: InfoStatus;
  confidence: number;
}

export interface AuditoriumShowtimeSummary {
  id: number;
  movieId: number;
  movieTitle: string;
  startsAt: string;
  format: string;
  priceAdult: number;
  isSynthetic: boolean;
  bookingUrl: string | null;
}

export interface AuditoriumDetail {
  id: number;
  no: string;
  brand: string;
  seatCount: number | null;
  status: string;
  location: { name: string; chain: string; status: string; transitNote: string | null };
  specHistory: AuditoriumSpecHistory[]; // 최신(valid_to IS NULL) 우선
  observations: AuditoriumObservation[];
  seatZones: SeatZone[];
  upcomingShowtimes: AuditoriumShowtimeSummary[];
}

export interface AuditoriumOption {
  id: number;
  label: string; // "CGV 용산아이파크몰 IMAX관"
  brand: string;
  locationName: string;
  locationStatus: string;
}

const parseJson = (s: string | null): Record<string, unknown> =>
  s ? (JSON.parse(s) as Record<string, unknown>) : {};

export function createCinemaRepository(getDb: () => DbClient) {
  const seatZones = createSeatZoneRepository(getDb);

  async function listAuditoriums(): Promise<AuditoriumOption[]> {
    const rows = await getDb().query<{
      id: number;
      auditorium_no: string;
      brand: string;
      loc_name: string;
      loc_status: string;
    }>(
      `SELECT a.id, a.auditorium_no, a.brand, l.name AS loc_name, l.status AS loc_status
       FROM auditoriums a JOIN cinema_locations l ON l.id = a.location_id
       ORDER BY l.name, a.auditorium_no`,
    );
    return rows.map((r) => ({
      id: r.id,
      label: `${r.loc_name} ${r.auditorium_no}`,
      brand: r.brand,
      locationName: r.loc_name,
      locationStatus: r.loc_status,
    }));
  }

  return {
    listAuditoriums,

    async findAuditorium(id: number): Promise<AuditoriumOption | null> {
      return (await listAuditoriums()).find((a) => a.id === id) ?? null;
    },

    /** 상영관 상세 — 사양 이력·관측 근거·좌석 존·예정 회차 (docs/09 화면 8 축소) */
    async getAuditoriumDetail(id: number, nowIso: string): Promise<AuditoriumDetail | null> {
      const db = getDb();
      const audRows = await db.query<{
        id: number;
        auditorium_no: string;
        brand: string;
        seat_count: number | null;
        status: string;
        loc_name: string;
        chain: string;
        loc_status: string;
        transit_note: string | null;
      }>(
        `SELECT a.id, a.auditorium_no, a.brand, a.seat_count, a.status,
                l.name AS loc_name, l.chain, l.status AS loc_status, l.transit_note
         FROM auditoriums a JOIN cinema_locations l ON l.id = a.location_id WHERE a.id = ?`,
        [id],
      );
      const aud = audRows[0];
      if (!aud) return null;

      const specRows = await db.query<Record<string, string | number | null>>(
        `SELECT sp.*, s.name AS source_name, s.url AS source_url
         FROM auditorium_specs sp LEFT JOIN sources s ON s.id = sp.source_id
         WHERE sp.auditorium_id = ?
         ORDER BY (CASE WHEN sp.valid_to IS NULL THEN 0 ELSE 1 END), sp.valid_from DESC`,
        [id],
      );

      const specHistory: AuditoriumSpecHistory[] = specRows.map((r) => {
        const proj = parseJson(r.projector as string | null);
        const screen = parseJson(r.screen as string | null);
        const sound = parseJson(r.sound as string | null);
        return {
          validFrom: r.valid_from as string,
          validTo: (r.valid_to as string | null) ?? null,
          projector: {
            lightSource: proj.light_source as string | undefined,
            resolution: proj.resolution as string | undefined,
            imaxGrade: proj.imax_grade as string | undefined,
            dolbyVision: proj.dolby_vision as boolean | undefined,
            dual: proj.dual as boolean | undefined,
          },
          screen: {
            widthM: screen.width_m as number | undefined,
            heightM: screen.height_m as number | undefined,
            aspect: screen.aspect as string | undefined,
            curved: screen.curved as boolean | undefined,
          },
          sound: { format: sound.format as string | undefined, ceiling: sound.ceiling as boolean | undefined },
          supportedAr: (r.supported_ar as string | null) ?? null,
          masking: (r.masking as string | null) ?? null,
          notes: (r.notes as string | null) ?? null,
          renewalEvent: (r.renewal_event as string | null) ?? null,
          infoStatus: r.info_status as InfoStatus,
          observedAt: r.observed_at as string,
          confidence: r.confidence as number,
          sourceName: (r.source_name as string | null) ?? null,
          sourceUrl: (r.source_url as string | null) ?? null,
        };
      });

      const observations = (
        await db.query<{
          field: string;
          value: string;
          observed_at: string;
          info_status: InfoStatus;
          confidence: number;
          source_name: string | null;
        }>(
          `SELECT o.field, o.value, o.observed_at, o.info_status, o.confidence, s.name AS source_name
           FROM observations o LEFT JOIN sources s ON s.id = o.source_id
           WHERE o.entity_type = 'auditorium' AND o.entity_id = ?
           ORDER BY o.observed_at DESC`,
          [id],
        )
      ).map((o) => ({
        field: o.field,
        value: JSON.parse(o.value) as unknown,
        sourceName: o.source_name,
        observedAt: o.observed_at,
        infoStatus: o.info_status,
        confidence: o.confidence,
      }));

      const upcomingShowtimes = (
        await db.query<{
          id: number;
          movie_id: number;
          title: string;
          starts_at: string;
          format: string;
          price_adult: number;
          is_synthetic: number;
          booking_url: string | null;
        }>(
          `SELECT st.id, st.movie_id, m.title, st.starts_at, st.format, st.price_adult,
                  st.is_synthetic, st.booking_url
           FROM showtimes st JOIN movies m ON m.id = st.movie_id
           WHERE st.auditorium_id = ? AND st.status = 'active' AND st.starts_at >= ?
           ORDER BY st.starts_at LIMIT 20`,
          [id, nowIso],
        )
      ).map((s) => ({
        id: s.id,
        movieId: s.movie_id,
        movieTitle: s.title,
        startsAt: s.starts_at,
        format: s.format,
        priceAdult: s.price_adult,
        isSynthetic: Boolean(s.is_synthetic),
        bookingUrl: s.booking_url,
      }));

      return {
        id: aud.id,
        no: aud.auditorium_no,
        brand: aud.brand,
        seatCount: aud.seat_count,
        status: aud.status,
        location: {
          name: aud.loc_name,
          chain: aud.chain,
          status: aud.loc_status,
          transitNote: aud.transit_note,
        },
        specHistory,
        observations,
        seatZones: await seatZones.listByAuditorium(id),
        upcomingShowtimes,
      };
    },
  };
}

export const cinemaRepository = createCinemaRepository(getAppDbClient);
