// 관리자 회차 서비스 — 생성·수정·비활성화·복제 + 변경 이력(불변).
// 완전 삭제는 제공하지 않는다(비활성화 + 이력 우선).
import { getDb } from './db';
import { cinemaRepository } from './cinemaRepository';
import { movieRepository } from './movieRepository';
import { getAppClock } from '../lib/clock';
import type { AdminShowtimeInput } from '../lib/adminValidation';

export interface AdminServiceOptions {
  now?: () => Date;
  actor?: string;
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
}

export type AdminResult =
  | { ok: true; id: number; warnings: string[] }
  | { ok: false; errors: string[]; needsMismatchNote?: boolean };

// 특별관 포맷은 해당 브랜드 관에서만 가능. standard는 모든 관(모션 제외) 허용.
const BRAND_REQUIRED: Record<string, string | null> = {
  imax: 'imax',
  dolby_cinema: 'dolby_cinema',
  '4dx': '4dx',
  screenx: 'screenx',
  superplex: 'superplex',
  standard: null,
};

function getOrCreateAdminSource(): number {
  const db = getDb();
  const row = db.prepare(`SELECT id FROM sources WHERE kind='admin' LIMIT 1`).get() as
    | { id: number }
    | undefined;
  if (row) return row.id;
  return Number(
    db
      .prepare(`INSERT INTO sources (kind, name, trust_weight) VALUES ('admin', '관리자 수동 확인', 0.85)`)
      .run().lastInsertRowid,
  );
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

function logChange(
  showtimeId: number,
  action: 'create' | 'update' | 'disable' | 'enable' | 'duplicate',
  changes: unknown,
  actor: string,
): void {
  getDb()
    .prepare(`INSERT INTO showtime_changes (showtime_id, actor, action, changes) VALUES (?,?,?,?)`)
    .run(showtimeId, actor, action, changes ? JSON.stringify(changes) : null);
}

export function validateShowtime(
  input: AdminShowtimeInput,
  opts: AdminServiceOptions & { excludeShowtimeId?: number } = {},
): { errors: string[]; warnings: string[]; needsMismatchNote: boolean; starts?: Date; ends?: Date } {
  const db = getDb();
  const now = opts.now?.() ?? getAppClock().now();
  const errors: string[] = [];
  const warnings: string[] = [];
  let needsMismatchNote = false;

  const movie = movieRepository.findById(input.movieId);
  if (!movie) errors.push('존재하지 않는 영화입니다.');
  const auditorium = cinemaRepository.findAuditorium(input.auditoriumId);
  if (!auditorium) errors.push('존재하지 않는 상영관입니다.');
  if (!movie || !auditorium) return { errors, warnings, needsMismatchNote };

  const { starts, ends } = computeTimes(input, movie.runtimeMin);
  if (ends.getTime() <= starts.getTime())
    errors.push('종료 시각이 시작 시각보다 빠릅니다. 자정을 넘는 심야 회차는 crossesMidnight를 사용하세요.');
  if (starts.getTime() < now.getTime())
    errors.push('과거 시각의 회차는 등록할 수 없습니다.');

  // 상영관에서 물리적으로 불가능한 포맷 (하드 오류 — 우회 불가)
  const requiredBrand = BRAND_REQUIRED[input.format];
  if (requiredBrand && auditorium.brand !== requiredBrand)
    errors.push(`이 상영관(${auditorium.brand})에서는 ${input.format} 포맷 상영이 불가능합니다.`);

  // 동일 회차 중복 (같은 관·같은 시작 시각·활성)
  const dup = db
    .prepare(
      `SELECT id FROM showtimes WHERE auditorium_id=? AND starts_at=? AND status='active'${
        opts.excludeShowtimeId ? ' AND id != ?' : ''
      }`,
    )
    .get(
      ...([input.auditoriumId, starts.toISOString(), opts.excludeShowtimeId].filter(
        (v) => v !== undefined,
      ) as (string | number)[]),
    );
  if (dup) errors.push('동일한 상영관·시작 시각의 활성 회차가 이미 존재합니다.');

  // 영화 배급 버전과 회차 포맷 불일치 — 경고 + 근거(mismatchNote) 기록 시 저장 허용
  const versions = (movie.specs.format_versions?.value as string[] | undefined) ?? [];
  const required = input.format === 'superplex' ? 'standard' : input.format;
  if (versions.length && !versions.includes(required)) {
    if (input.mismatchNote) {
      warnings.push(
        `배급 버전(${versions.join(',')})에 없는 포맷(${input.format})을 근거와 함께 등록합니다.`,
      );
    } else {
      needsMismatchNote = true;
      errors.push(
        `이 영화의 확인된 배급 버전(${versions.join(', ')})에 ${input.format}가 없습니다. 근거(mismatchNote)를 입력하면 저장할 수 있습니다.`,
      );
    }
  }

  return { errors, warnings, needsMismatchNote, starts, ends };
}

export function createShowtime(
  input: AdminShowtimeInput,
  opts: AdminServiceOptions & { duplicateOf?: number } = {},
): AdminResult {
  const v = validateShowtime(input, opts);
  if (v.errors.length) return { ok: false, errors: v.errors, needsMismatchNote: v.needsMismatchNote };

  const db = getDb();
  const now = (opts.now?.() ?? getAppClock().now()).toISOString();
  const id = Number(
    db
      .prepare(
        `INSERT INTO showtimes
           (movie_id, auditorium_id, starts_at, ends_at_est, format, is_3d, language, price_adult,
            booking_url, entry_method, data_checked_at, source_id, info_status,
            status, is_synthetic, admin_note, verified_at, format_mismatch_note)
         VALUES (?,?,?,?,?,?,?,?,?,'manual',?,?,?,?,?,?,?,?)`,
      )
      .run(
        input.movieId,
        input.auditoriumId,
        v.starts!.toISOString(),
        v.ends!.toISOString(),
        input.format,
        input.is3d ? 1 : 0,
        input.language,
        input.price,
        input.bookingUrl,
        now,
        getOrCreateAdminSource(),
        input.infoStatus,
        input.status,
        input.isSynthetic ? 1 : 0,
        input.adminNote ?? null,
        now,
        input.mismatchNote ?? null,
      ).lastInsertRowid,
  );
  logChange(id, 'create', { input: { ...input }, sourceNote: input.sourceNote }, opts.actor ?? 'admin');
  if (opts.duplicateOf) logChange(id, 'duplicate', { from: opts.duplicateOf }, opts.actor ?? 'admin');
  return { ok: true, id, warnings: v.warnings };
}

export function updateShowtime(
  id: number,
  input: AdminShowtimeInput,
  opts: AdminServiceOptions = {},
): AdminResult {
  const db = getDb();
  const existing = db.prepare(`SELECT * FROM showtimes WHERE id=?`).get(id) as
    | Record<string, unknown>
    | undefined;
  if (!existing) return { ok: false, errors: ['존재하지 않는 회차입니다.'] };

  const v = validateShowtime(input, { ...opts, excludeShowtimeId: id });
  if (v.errors.length) return { ok: false, errors: v.errors, needsMismatchNote: v.needsMismatchNote };

  const now = (opts.now?.() ?? getAppClock().now()).toISOString();
  db.prepare(
    `UPDATE showtimes SET movie_id=?, auditorium_id=?, starts_at=?, ends_at_est=?, format=?, is_3d=?,
       language=?, price_adult=?, booking_url=?, data_checked_at=?, info_status=?, status=?,
       is_synthetic=?, admin_note=?, verified_at=?, format_mismatch_note=? WHERE id=?`,
  ).run(
    input.movieId,
    input.auditoriumId,
    v.starts!.toISOString(),
    v.ends!.toISOString(),
    input.format,
    input.is3d ? 1 : 0,
    input.language,
    input.price,
    input.bookingUrl,
    now,
    input.infoStatus,
    input.status,
    input.isSynthetic ? 1 : 0,
    input.adminNote ?? null,
    now,
    input.mismatchNote ?? null,
    id,
  );
  logChange(id, 'update', { before: existing, sourceNote: input.sourceNote }, opts.actor ?? 'admin');
  return { ok: true, id, warnings: v.warnings };
}

export function setShowtimeStatus(
  id: number,
  status: 'active' | 'disabled',
  opts: AdminServiceOptions = {},
): AdminResult {
  const db = getDb();
  const existing = db.prepare(`SELECT id, status FROM showtimes WHERE id=?`).get(id) as
    | { id: number; status: string }
    | undefined;
  if (!existing) return { ok: false, errors: ['존재하지 않는 회차입니다.'] };
  db.prepare(`UPDATE showtimes SET status=? WHERE id=?`).run(status, id);
  logChange(id, status === 'disabled' ? 'disable' : 'enable', { from: existing.status, to: status }, opts.actor ?? 'admin');
  return { ok: true, id, warnings: [] };
}

export interface AdminListFilters {
  date?: string;
  movieId?: number;
  auditoriumId?: number;
  format?: string;
  status?: string;
  synthetic?: 'synthetic' | 'verified';
}

export function listShowtimes(filters: AdminListFilters = {}): AdminShowtimeRow[] {
  const where: string[] = [];
  const params: (string | number)[] = [];
  if (filters.date) {
    where.push(`date(st.starts_at, '+9 hours') = ?`);
    params.push(filters.date);
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

  return getDb()
    .prepare(
      `SELECT st.id, st.movie_id, m.title AS movie_title, st.auditorium_id,
              l.name || ' ' || a.auditorium_no AS auditorium_label, a.brand,
              st.starts_at, st.ends_at_est, st.format, st.is_3d, st.language, st.price_adult,
              st.booking_url, st.entry_method, st.data_checked_at, st.info_status,
              st.status, st.is_synthetic, st.admin_note, st.verified_at, st.format_mismatch_note
       FROM showtimes st
       JOIN movies m ON m.id = st.movie_id
       JOIN auditoriums a ON a.id = st.auditorium_id
       JOIN cinema_locations l ON l.id = a.location_id
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
       ORDER BY st.starts_at`,
    )
    .all(...params) as unknown as AdminShowtimeRow[];
}

export function getShowtime(id: number): AdminShowtimeRow | null {
  const rows = listShowtimes({});
  return rows.find((r) => r.id === id) ?? null;
}

export function listChanges(showtimeId: number) {
  return getDb()
    .prepare(
      `SELECT actor, action, changes, created_at FROM showtime_changes
       WHERE showtime_id=? ORDER BY created_at DESC, id DESC`,
    )
    .all(showtimeId) as unknown as { actor: string; action: string; changes: string | null; created_at: string }[];
}
