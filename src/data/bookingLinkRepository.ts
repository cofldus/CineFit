// 예매 링크 검증 기록 — booking_link_checks는 불변 로그(INSERT만), 최신 상태는 조회 시 계산한다.
import type { BookingLinkStatus } from '../domain/bookingLink/checker';
import { getAppDbClient } from './client/index';
import type { DbClient } from './client/types';

export interface CheckableShowtime {
  showtimeId: number;
  bookingUrl: string;
  chain: string;
  startsAt: string;
  movieTitle: string;
  auditoriumLabel: string;
}

export interface LatestBookingLinkCheck {
  showtimeId: number;
  bookingUrl: string;
  chain: string;
  startsAt: string;
  movieTitle: string;
  auditoriumLabel: string;
  status: BookingLinkStatus | null;
  httpStatus: number | null;
  checkedAt: string | null;
}

export function createBookingLinkRepository(getDb: () => DbClient) {
  return {
    /** 검증 대상 — 활성·비합성 회차 중 예매 URL이 있는 것만(합성 데이터는 실제 링크가 아니다). */
    async listCheckableShowtimes(limit = 500): Promise<CheckableShowtime[]> {
      return getDb().query<CheckableShowtime>(
        `SELECT st.id AS showtimeId, st.booking_url AS bookingUrl, l.chain AS chain,
                st.starts_at AS startsAt, m.title AS movieTitle,
                l.name || ' ' || a.auditorium_no AS auditoriumLabel
         FROM showtimes st
         JOIN auditoriums a ON a.id = st.auditorium_id
         JOIN cinema_locations l ON l.id = a.location_id
         JOIN movies m ON m.id = st.movie_id
         WHERE st.status = 'active' AND st.is_synthetic = 0 AND st.booking_url IS NOT NULL
         ORDER BY st.starts_at
         LIMIT ?`,
        [limit],
      );
    },

    async recordCheck(input: {
      showtimeId: number;
      status: BookingLinkStatus;
      httpStatus: number | null;
      note: string | null;
      checkedAt: string;
    }): Promise<void> {
      await getDb().run(
        `INSERT INTO booking_link_checks (showtime_id, status, http_status, note, checked_at) VALUES (?,?,?,?,?)`,
        [input.showtimeId, input.status, input.httpStatus, input.note, input.checkedAt],
      );
    },

    /** 관리자 대시보드용 — 회차별 가장 최근 검증 결과 하나씩(없으면 status/httpStatus/checkedAt은 null). */
    async listLatestChecks(limit = 500): Promise<LatestBookingLinkCheck[]> {
      const showtimes = await getDb().query<CheckableShowtime>(
        `SELECT st.id AS showtimeId, st.booking_url AS bookingUrl, l.chain AS chain,
                st.starts_at AS startsAt, m.title AS movieTitle,
                l.name || ' ' || a.auditorium_no AS auditoriumLabel
         FROM showtimes st
         JOIN auditoriums a ON a.id = st.auditorium_id
         JOIN cinema_locations l ON l.id = a.location_id
         JOIN movies m ON m.id = st.movie_id
         WHERE st.status = 'active' AND st.is_synthetic = 0 AND st.booking_url IS NOT NULL
         ORDER BY st.starts_at
         LIMIT ?`,
        [limit],
      );
      if (showtimes.length === 0) return [];

      const latest = await getDb().query<{ showtime_id: number; status: string; http_status: number | null; checked_at: string }>(
        `SELECT c.showtime_id, c.status, c.http_status, c.checked_at
         FROM booking_link_checks c
         WHERE c.id IN (
           SELECT MAX(id) FROM booking_link_checks GROUP BY showtime_id
         )`,
      );
      const latestByShowtime = new Map(latest.map((r) => [r.showtime_id, r]));

      return showtimes.map((s): LatestBookingLinkCheck => {
        const check = latestByShowtime.get(s.showtimeId);
        return {
          ...s,
          status: (check?.status as BookingLinkStatus | undefined) ?? null,
          httpStatus: check?.http_status ?? null,
          checkedAt: check?.checked_at ?? null,
        };
      });
    },
  };
}

export const bookingLinkRepository = createBookingLinkRepository(getAppDbClient);
