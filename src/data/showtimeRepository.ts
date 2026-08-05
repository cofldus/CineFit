import type { AuditoriumSpec, CandidateShowtime, FormatId, InfoStatus, SeatZone } from '../domain/recommendation/types';
import { seoulDateString, seoulDayUtcRange } from '../lib/clock';
import { getAppDbClient } from './client/index';
import type { DbClient } from './client/types';
import { createSeatZoneRepository } from './seatZoneRepository';

interface CandidateRow {
  id: number;
  movie_id: number;
  starts_at: string;
  ends_at_est: string;
  format: FormatId;
  language: string | null;
  price_adult: number;
  entry_method: string;
  data_checked_at: string;
  st_status: InfoStatus;
  is_synthetic: number;
  booking_url: string | null;
  verified_at: string | null;
  source_url: string | null;
  expires_at: string | null;
  verification_status: string;
  aud_id: number;
  auditorium_no: string;
  brand: string;
  seat_count: number | null;
  aud_status: string;
  loc_id: number;
  chain: string;
  loc_name: string;
  lat: number;
  lng: number;
  loc_status: string;
  transit_note: string | null;
  projector: string | null;
  screen: string | null;
  sound: string | null;
  supported_ar: string | null;
  masking: string | null;
  spec_notes: string | null;
  renewal_event: string | null;
  spec_status: InfoStatus | null;
  spec_observed: string | null;
  spec_conf: number | null;
  spec_source_name: string | null;
  spec_source_url: string | null;
}

// seed.mjs의 snake_case JSON → 도메인 camelCase 매핑
function parseProjector(json: string | null): AuditoriumSpec['projector'] {
  if (!json) return null;
  const p = JSON.parse(json) as Record<string, unknown>;
  return {
    lightSource: p.light_source as string | undefined,
    resolution: p.resolution as string | undefined,
    imaxGrade: p.imax_grade as string | undefined,
    dolbyVision: p.dolby_vision as boolean | undefined,
    dual: p.dual as boolean | undefined,
  };
}

function parseScreen(json: string | null): AuditoriumSpec['screen'] {
  if (!json) return null;
  const s = JSON.parse(json) as Record<string, unknown>;
  return {
    widthM: s.width_m as number | undefined,
    heightM: s.height_m as number | undefined,
    aspect: s.aspect as string | undefined,
    curved: s.curved as boolean | undefined,
  };
}

function parseSound(json: string | null): AuditoriumSpec['sound'] {
  if (!json) return null;
  const s = JSON.parse(json) as Record<string, unknown>;
  return { format: s.format as string | undefined, ceiling: s.ceiling as boolean | undefined };
}

function toCandidate(r: CandidateRow, seatZones: SeatZone[]): CandidateShowtime {
  const spec: AuditoriumSpec | null = r.spec_status
    ? {
        projector: parseProjector(r.projector),
        screen: parseScreen(r.screen),
        sound: parseSound(r.sound),
        supportedAr: r.supported_ar,
        masking: r.masking,
        notes: r.spec_notes,
        renewalEvent: r.renewal_event,
        infoStatus: r.spec_status,
        observedAt: r.spec_observed ?? r.data_checked_at,
        confidence: r.spec_conf ?? 0.3,
        sourceName: r.spec_source_name,
        sourceUrl: r.spec_source_url,
      }
    : null;

  return {
    showtimeId: r.id,
    movieId: r.movie_id,
    startsAt: r.starts_at,
    endsAtEst: r.ends_at_est,
    format: r.format,
    language: r.language,
    priceAdult: r.price_adult,
    entryMethod: r.entry_method,
    dataCheckedAt: r.data_checked_at,
    showtimeInfoStatus: r.st_status,
    isSynthetic: Boolean(r.is_synthetic),
    bookingUrl: r.booking_url,
    verifiedAt: r.verified_at,
    sourceUrl: r.source_url,
    expiresAt: r.expires_at,
    verificationStatus: r.verification_status,
    auditorium: {
      id: r.aud_id,
      no: r.auditorium_no,
      brand: r.brand,
      seatCount: r.seat_count,
      status: r.aud_status,
      spec,
      seatZones,
    },
    location: {
      id: r.loc_id,
      chain: r.chain,
      name: r.loc_name,
      lat: r.lat,
      lng: r.lng,
      status: r.loc_status,
      transitNote: r.transit_note,
    },
  };
}

export function createShowtimeRepository(getDb: () => DbClient) {
  const seatZones = createSeatZoneRepository(getDb);

  return {
    async listCandidates(movieId: number, date: string): Promise<CandidateShowtime[]> {
      // KST 날짜 → UTC ISO 범위 (방언 독립 — 문자열 비교는 ISO-Z에서 시간순과 일치)
      const { start, end } = seoulDayUtcRange(date);
      const rows = await getDb().query<CandidateRow>(
        `SELECT st.id, st.movie_id, st.starts_at, st.ends_at_est, st.format, st.language,
                st.price_adult, st.entry_method, st.data_checked_at, st.info_status AS st_status,
                st.is_synthetic, st.booking_url, st.verified_at,
                st.source_url, st.expires_at, st.verification_status,
                a.id AS aud_id, a.auditorium_no, a.brand, a.seat_count, a.status AS aud_status,
                l.id AS loc_id, l.chain, l.name AS loc_name, l.lat, l.lng,
                l.status AS loc_status, l.transit_note,
                sp.projector, sp.screen, sp.sound, sp.supported_ar, sp.masking,
                sp.notes AS spec_notes, sp.renewal_event, sp.info_status AS spec_status,
                sp.observed_at AS spec_observed, sp.confidence AS spec_conf,
                ssrc.name AS spec_source_name, ssrc.url AS spec_source_url
         FROM showtimes st
         JOIN auditoriums a ON a.id = st.auditorium_id
         JOIN cinema_locations l ON l.id = a.location_id
         LEFT JOIN auditorium_specs sp ON sp.auditorium_id = a.id AND sp.valid_to IS NULL
         LEFT JOIN sources ssrc ON ssrc.id = sp.source_id
         WHERE st.movie_id = ? AND st.starts_at >= ? AND st.starts_at < ? AND st.status = 'active'
         ORDER BY st.starts_at`,
        [movieId, start, end],
      );
      const zoneMap = await seatZones.listByAuditoriums([...new Set(rows.map((r) => r.aud_id))]);
      return rows.map((r) => toCandidate(r, zoneMap.get(r.aud_id) ?? []));
    },

    /** 활성 회차가 있는 날짜 목록 (Asia/Seoul 기준, 오름차순) — 날짜 계산은 JS에서 */
    async listActiveDates(movieId: number): Promise<string[]> {
      const rows = await getDb().query<{ starts_at: string }>(
        `SELECT starts_at FROM showtimes WHERE movie_id = ? AND status = 'active' ORDER BY starts_at`,
        [movieId],
      );
      return [...new Set(rows.map((r) => seoulDateString(new Date(r.starts_at))))];
    },
  };
}

export const showtimeRepository = createShowtimeRepository(getAppDbClient);
