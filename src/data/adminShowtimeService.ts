// 관리자 회차 서비스 — 생성·수정·비활성화·복제 + 변경 이력(불변).
// 완전 삭제는 제공하지 않는다(비활성화 + 이력 우선).
import { getAppDbClient } from './client/index';
import type { DbClient } from './client/types';
import { createCinemaRepository } from './cinemaRepository';
import { createMovieRepository } from './movieRepository';
import { getAppClock, seoulDayUtcRange } from '../lib/clock';
import { validateSourceUrl } from '../lib/sourceUrlValidation';
import type { AdminShowtimeInput } from '../lib/adminValidation';

export interface AdminServiceOptions {
  now?: () => Date;
  actor?: string;
  /** 회차 공급원 식별자 — 'admin_manual'(폼) | 'csv_import' 등 (R21) */
  provider?: string;
  /** 확인 시각 덮어쓰기(CSV import의 checkedAt) — 없으면 now */
  checkedAt?: string;
}

export interface AdminShowtimeRow {
  id: number;
  movie_id: number;
  movie_title: string;
  auditorium_id: number;
  auditorium_label: string;
  brand: string;
  starts_at: string;
  ends_at_est: string;
  format: string;
  is_3d: number;
  language: string | null;
  price_adult: number;
  booking_url: string | null;
  entry_method: string;
  data_checked_at: string;
  info_status: string;
  status: string;
  is_synthetic: number;
  admin_note: string | null;
  verified_at: string | null;
  format_mismatch_note: string | null;
  provider: string | null;
  source_url: string | null;
  expires_at: string | null;
  verification_status: string;
}

export type AdminResult =
  | { ok: true; id: number; warnings: string[] }
  | { ok: false; errors: string[]; needsMismatchNote?: boolean };

// 특별관 포맷은 해당 브랜드 관에서만 가능. standard는 모든 관(모션 제외) 허용.
const BRAND_REQUIRED: Record<string, string | null> = {
  imax: 'imax',
  dolby_cinema: 'dolby_cinema',
  '4dx': '4dx',
  mx4d: 'mx4d',
  screenx: 'screenx',
  superplex: 'superplex',
  standard: null,
};

export function createAdminShowtimeService(getDb: () => DbClient) {
  const movies = createMovieRepository(getDb);
  const cinemas = createCinemaRepository(getDb);

  async function getOrCreateAdminSource(): Promise<number> {
    const db = getDb();
    const rows = await db.query<{ id: number }>(`SELECT id FROM sources WHERE kind='admin' LIMIT 1`);
    if (rows[0]) return rows[0].id;
    const inserted = await db.query<{ id: number }>(
      `INSERT INTO sources (kind, name, trust_weight) VALUES ('admin', '관리자 수동 확인', 0.85) RETURNING id`,
    );
    return inserted[0].id;
  }

  function computeTimes(input: AdminShowtimeInput, runtimeMin: number) {
    const starts = new Date(`${input.date}T${input.startTime}:00+09:00`);
    let ends: Date;
    if (input.endTime) {
      ends = new Date(`${input.date}T${input.endTime}:00+09:00`);
      if (input.crossesMidnight) ends = new Date(ends.getTime() + 86_400_000);
    } else {
      ends = new Date(starts.getTime() + (runtimeMin + 20) * 60_000); // 광고 20분 포함 추정
    }
    return { starts, ends };
  }

  async function logChange(
    showtimeId: number,
    action: 'create' | 'update' | 'disable' | 'enable' | 'duplicate',
    changes: unknown,
    actor: string,
    nowIso: string,
  ): Promise<void> {
    await getDb().run(
      `INSERT INTO showtime_changes (showtime_id, actor, action, changes, created_at) VALUES (?,?,?,?,?)`,
      [showtimeId, actor, action, changes ? JSON.stringify(changes) : null, nowIso],
    );
  }

  async function validateShowtime(
    input: AdminShowtimeInput,
    opts: AdminServiceOptions & { excludeShowtimeId?: number } = {},
  ): Promise<{ errors: string[]; warnings: string[]; needsMismatchNote: boolean; starts?: Date; ends?: Date }> {
    const db = getDb();
    const now = opts.now?.() ?? getAppClock().now();
    const errors: string[] = [];
    const warnings: string[] = [];
    let needsMismatchNote = false;

    const movie = await movies.findById(input.movieId);
    if (!movie) errors.push('존재하지 않는 영화입니다.');
    const auditorium = await cinemas.findAuditorium(input.auditoriumId);
    if (!auditorium) errors.push('존재하지 않는 상영관입니다.');
    if (!movie || !auditorium) return { errors, warnings, needsMismatchNote };

    const { starts, ends } = computeTimes(input, movie.runtimeMin);
    if (ends.getTime() <= starts.getTime())
      errors.push('종료 시각이 시작 시각보다 빠릅니다. 자정을 넘는 심야 회차는 crossesMidnight를 사용하세요.');
    if (starts.getTime() < now.getTime()) errors.push('과거 시각의 회차는 등록할 수 없습니다.');

    // 상영관에서 물리적으로 불가능한 포맷 (하드 오류 — 우회 불가)
    const requiredBrand = BRAND_REQUIRED[input.format];
    if (requiredBrand && auditorium.brand !== requiredBrand)
      errors.push(`이 상영관(${auditorium.brand})에서는 ${input.format} 포맷 상영이 불가능합니다.`);

    // R21.1 §2 — 실제 회차(비합성)는 source URL 필수 + 극장사 공식 도메인만.
    // booking_url도 같은 기준으로 검증한다(예매 딥링크가 placeholder/사설 호스트면 무의미).
    // CSV preview/commit·수동 폼이 전부 이 validateShowtime을 지나므로 검증 경로는 하나다.
    if (!input.isSynthetic) {
      const src = validateSourceUrl(input.sourceUrl, {
        requireOfficial: true,
        fieldLabel: '확인한 공식 페이지 URL(sourceUrl)',
      });
      if (!src.ok) errors.push(src.error);
      const booking = validateSourceUrl(input.bookingUrl, {
        requireOfficial: true,
        fieldLabel: '공식 예매 URL(bookingUrl)',
      });
      if (!booking.ok) errors.push(booking.error);
    }

    // 동일 회차 중복 (같은 관·같은 시작 시각·활성)
    const dupParams: (string | number)[] = [input.auditoriumId, starts.toISOString()];
    if (opts.excludeShowtimeId) dupParams.push(opts.excludeShowtimeId);
    const dup = await db.query<{ id: number }>(
      `SELECT id FROM showtimes WHERE auditorium_id=? AND starts_at=? AND status='active'${
        opts.excludeShowtimeId ? ' AND id != ?' : ''
      }`,
      dupParams,
    );
    if (dup[0]) errors.push('동일한 상영관·시작 시각의 활성 회차가 이미 존재합니다.');

    // 영화 배급 버전과 회차 포맷 불일치 — 경고 + 근거(mismatchNote) 기록 시 저장 허용
    const versions = (movie.specs.format_versions?.value as string[] | undefined) ?? [];
    const required = input.format === 'superplex' ? 'standard' : input.format;
    if (versions.length && !versions.includes(required)) {
      if (input.mismatchNote) {
        warnings.push(`배급 버전(${versions.join(',')})에 없는 포맷(${input.format})을 근거와 함께 등록합니다.`);
      } else {
        needsMismatchNote = true;
        errors.push(
          `이 영화의 확인된 배급 버전(${versions.join(', ')})에 ${input.format}가 없습니다. 근거(mismatchNote)를 입력하면 저장할 수 있습니다.`,
        );
      }
    }

    return { errors, warnings, needsMismatchNote, starts, ends };
  }

  async function createShowtime(
    input: AdminShowtimeInput,
    opts: AdminServiceOptions & { duplicateOf?: number } = {},
  ): Promise<AdminResult> {
    const v = await validateShowtime(input, opts);
    if (v.errors.length) return { ok: false, errors: v.errors, needsMismatchNote: v.needsMismatchNote };

    const db = getDb();
    const nowIso = (opts.now?.() ?? getAppClock().now()).toISOString();
    const checkedAt = opts.checkedAt ?? nowIso;
    // R21: 합성 회차는 verified로 저장될 수 없다 — synthetic/실제 데이터 혼동 차단.
    const verificationStatus = input.isSynthetic ? 'unverified' : input.verificationStatus;
    const rows = await db.query<{ id: number }>(
      `INSERT INTO showtimes
         (movie_id, auditorium_id, starts_at, ends_at_est, format, is_3d, language, price_adult,
          booking_url, entry_method, data_checked_at, source_id, info_status,
          status, is_synthetic, admin_note, verified_at, format_mismatch_note,
          provider, source_url, expires_at, verification_status)
       VALUES (?,?,?,?,?,?,?,?,?,'manual',?,?,?,?,?,?,?,?,?,?,?,?) RETURNING id`,
      [
        input.movieId,
        input.auditoriumId,
        v.starts!.toISOString(),
        v.ends!.toISOString(),
        input.format,
        input.is3d ? 1 : 0,
        input.language,
        input.price,
        input.bookingUrl,
        checkedAt,
        await getOrCreateAdminSource(),
        input.infoStatus,
        input.status,
        input.isSynthetic ? 1 : 0,
        input.adminNote ?? null,
        checkedAt,
        input.mismatchNote ?? null,
        opts.provider ?? 'admin_manual',
        // R21.1: booking_url 자동 대체 제거 — source_url은 명시 입력값만(실회차는 필수 검증 통과).
        input.sourceUrl ?? null,
        input.expiresAt ? new Date(input.expiresAt).toISOString() : null,
        verificationStatus,
      ],
    );
    const id = rows[0].id;
    await logChange(id, 'create', { input: { ...input }, sourceNote: input.sourceNote }, opts.actor ?? 'admin', nowIso);
    if (opts.duplicateOf) await logChange(id, 'duplicate', { from: opts.duplicateOf }, opts.actor ?? 'admin', nowIso);
    return { ok: true, id, warnings: v.warnings };
  }

  async function updateShowtime(
    id: number,
    input: AdminShowtimeInput,
    opts: AdminServiceOptions = {},
  ): Promise<AdminResult> {
    const db = getDb();
    const existing = (await db.query(`SELECT * FROM showtimes WHERE id=?`, [id]))[0];
    if (!existing) return { ok: false, errors: ['존재하지 않는 회차입니다.'] };

    const v = await validateShowtime(input, { ...opts, excludeShowtimeId: id });
    if (v.errors.length) return { ok: false, errors: v.errors, needsMismatchNote: v.needsMismatchNote };

    const nowIso = (opts.now?.() ?? getAppClock().now()).toISOString();
    const checkedAt = opts.checkedAt ?? nowIso;
    const verificationStatus = input.isSynthetic ? 'unverified' : input.verificationStatus;
    await db.run(
      `UPDATE showtimes SET movie_id=?, auditorium_id=?, starts_at=?, ends_at_est=?, format=?, is_3d=?,
         language=?, price_adult=?, booking_url=?, data_checked_at=?, info_status=?, status=?,
         is_synthetic=?, admin_note=?, verified_at=?, format_mismatch_note=?,
         source_url=?, expires_at=?, verification_status=? WHERE id=?`,
      [
        input.movieId,
        input.auditoriumId,
        v.starts!.toISOString(),
        v.ends!.toISOString(),
        input.format,
        input.is3d ? 1 : 0,
        input.language,
        input.price,
        input.bookingUrl,
        checkedAt,
        input.infoStatus,
        input.status,
        input.isSynthetic ? 1 : 0,
        input.adminNote ?? null,
        checkedAt,
        input.mismatchNote ?? null,
        input.sourceUrl ?? null,
        input.expiresAt ? new Date(input.expiresAt).toISOString() : null,
        verificationStatus,
        id,
      ],
    );
    await logChange(id, 'update', { before: existing, sourceNote: input.sourceNote }, opts.actor ?? 'admin', nowIso);
    return { ok: true, id, warnings: v.warnings };
  }

  async function setShowtimeStatus(
    id: number,
    status: 'active' | 'disabled',
    opts: AdminServiceOptions = {},
  ): Promise<AdminResult> {
    const db = getDb();
    const existing = (await db.query<{ id: number; status: string }>(`SELECT id, status FROM showtimes WHERE id=?`, [id]))[0];
    if (!existing) return { ok: false, errors: ['존재하지 않는 회차입니다.'] };
    const nowIso = (opts.now?.() ?? getAppClock().now()).toISOString();
    await db.run(`UPDATE showtimes SET status=? WHERE id=?`, [status, id]);
    await logChange(
      id,
      status === 'disabled' ? 'disable' : 'enable',
      { from: existing.status, to: status },
      opts.actor ?? 'admin',
      nowIso,
    );
    return { ok: true, id, warnings: [] };
  }

  async function listShowtimes(filters: AdminListFilters = {}): Promise<AdminShowtimeRow[]> {
    const where: string[] = [];
    const params: (string | number)[] = [];
    if (filters.date) {
      const { start, end } = seoulDayUtcRange(filters.date);
      where.push('st.starts_at >= ? AND st.starts_at < ?');
      params.push(start, end);
    }
    if (filters.movieId) {
      where.push('st.movie_id = ?');
      params.push(filters.movieId);
    }
    if (filters.auditoriumId) {
      where.push('st.auditorium_id = ?');
      params.push(filters.auditoriumId);
    }
    if (filters.format) {
      where.push('st.format = ?');
      params.push(filters.format);
    }
    if (filters.status) {
      where.push('st.status = ?');
      params.push(filters.status);
    }
    if (filters.synthetic) where.push(`st.is_synthetic = ${filters.synthetic === 'synthetic' ? 1 : 0}`);

    return getDb().query<AdminShowtimeRow>(
      `SELECT st.id, st.movie_id, m.title AS movie_title, st.auditorium_id,
              l.name || ' ' || a.auditorium_no AS auditorium_label, a.brand,
              st.starts_at, st.ends_at_est, st.format, st.is_3d, st.language, st.price_adult,
              st.booking_url, st.entry_method, st.data_checked_at, st.info_status,
              st.status, st.is_synthetic, st.admin_note, st.verified_at, st.format_mismatch_note,
              st.provider, st.source_url, st.expires_at, st.verification_status
       FROM showtimes st
       JOIN movies m ON m.id = st.movie_id
       JOIN auditoriums a ON a.id = st.auditorium_id
       JOIN cinema_locations l ON l.id = a.location_id
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
       ORDER BY st.starts_at`,
      params,
    );
  }

  // R21: 과거 회차 자동 만료 — 만료 시각(없으면 시작 시각)이 지난 활성 회차를
  // verification_status='expired'로 표시한다. maintenance:daily가 매일 호출.
  async function expirePastShowtimes(opts: AdminServiceOptions = {}): Promise<number> {
    const nowIso = (opts.now?.() ?? getAppClock().now()).toISOString();
    const r = await getDb().run(
      `UPDATE showtimes SET verification_status='expired'
       WHERE verification_status != 'expired'
         AND COALESCE(expires_at, starts_at) < ?`,
      [nowIso],
    );
    return r.changes;
  }

  return {
    validateShowtime,
    createShowtime,
    updateShowtime,
    setShowtimeStatus,
    listShowtimes,
    expirePastShowtimes,

    async getShowtime(id: number): Promise<AdminShowtimeRow | null> {
      const rows = await listShowtimes({});
      return rows.find((r) => r.id === id) ?? null;
    },

    async listChanges(showtimeId: number) {
      return getDb().query<{ actor: string; action: string; changes: string | null; created_at: string }>(
        `SELECT actor, action, changes, created_at FROM showtime_changes
         WHERE showtime_id=? ORDER BY created_at DESC, id DESC`,
        [showtimeId],
      );
    },
  };
}

export interface AdminListFilters {
  date?: string;
  movieId?: number;
  auditoriumId?: number;
  format?: string;
  status?: string;
  synthetic?: 'synthetic' | 'verified';
}

const defaultService = createAdminShowtimeService(getAppDbClient);
export const createShowtime = defaultService.createShowtime;
export const updateShowtime = defaultService.updateShowtime;
export const setShowtimeStatus = defaultService.setShowtimeStatus;
export const listShowtimes = defaultService.listShowtimes;
export const getShowtime = defaultService.getShowtime;
export const listChanges = defaultService.listChanges;
export const validateShowtime = defaultService.validateShowtime;
export const expirePastShowtimes = defaultService.expirePastShowtimes;
