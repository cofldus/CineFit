// R21 §2 — 관리자 회차 CSV import. 수동 폼과 같은 검증·기록 경로(adminShowtimeService)를
// 재사용해 preview(검증만)와 commit(등록)을 지원한다. 원칙:
// - sourceUrl(확인한 공식 페이지)·checkedAt(확인 시각) 필수
// - import되는 회차는 항상 실제 데이터(is_synthetic=0) — 합성과 완전 분리
// - 동일 회차(상영관+시작 시각) 중복은 서비스 검증 + DB 부분 유니크 인덱스로 차단
// - 영화는 제목/alias, 상영관은 별칭(auditorium_aliases) 또는 극장명+관 번호로 매핑
import { getAppDbClient } from './client/index';
import type { DbClient } from './client/types';
import { createAdminShowtimeService, type AdminServiceOptions } from './adminShowtimeService';
import { normalizeHeader, parseCsv } from '../lib/csv';
import { SHOWTIME_FORMATS, VERIFICATION_STATUSES, type AdminShowtimeInput } from '../lib/adminValidation';

const REQUIRED_COLUMNS = [
  'provider',
  'theater',
  'auditorium',
  'movie',
  'showdate',
  'startsat',
  'format',
  'price',
  'sourceurl',
  'checkedat',
] as const;
const OPTIONAL_COLUMNS = ['expiresat', 'verificationstatus'] as const;

export interface ImportRowResult {
  /** CSV 파일 기준 행 번호(헤더 = 1행) */
  line: number;
  raw: Record<string, string>;
  status: 'ready' | 'error' | 'created';
  errors: string[];
  warnings: string[];
  resolved?: {
    movieId: number;
    movieTitle: string;
    auditoriumId: number;
    auditoriumLabel: string;
    startsAtIso: string;
  };
  createdId?: number;
}

export interface ImportResult {
  ok: boolean;
  committed: boolean;
  headerErrors: string[];
  summary: { total: number; ready: number; errors: number; created: number };
  rows: ImportRowResult[];
}

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const YMD = /^\d{4}-\d{2}-\d{2}$/;

function isHttpUrl(v: string): boolean {
  try {
    const u = new URL(v);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

export function createShowtimeImportService(getDb: () => DbClient) {
  const adminService = createAdminShowtimeService(getDb);

  async function resolveMovie(name: string): Promise<{ id: number; title: string } | null> {
    const db = getDb();
    const exact = await db.query<{ id: number; title: string }>(`SELECT id, title FROM movies WHERE title = ?`, [name]);
    if (exact[0]) return exact[0];
    const byAlias = await db.query<{ id: number; title: string }>(
      `SELECT m.id, m.title FROM movies m JOIN movie_aliases al ON al.movie_id = m.id WHERE al.alias = ?`,
      [name],
    );
    return byAlias[0] ?? null;
  }

  async function resolveAuditorium(
    theater: string,
    auditorium: string,
  ): Promise<{ id: number; label: string } | { error: string }> {
    const db = getDb();
    // 1) 별칭 우선 — '용아맥'처럼 극장 칸 하나로 지칭하는 경우.
    const aliasKey = auditorium ? `${theater} ${auditorium}` : theater;
    for (const key of [aliasKey, theater]) {
      const byAlias = await db.query<{ id: number; label: string }>(
        `SELECT a.id, l.name || ' ' || a.auditorium_no AS label
         FROM auditorium_aliases al
         JOIN auditoriums a ON a.id = al.auditorium_id
         JOIN cinema_locations l ON l.id = a.location_id
         WHERE al.alias = ?`,
        [key],
      );
      if (byAlias.length === 1) return byAlias[0];
      if (byAlias.length > 1) return { error: `별칭 '${key}'가 여러 상영관과 일치합니다.` };
    }
    // 2) 극장명(부분 일치) + 관 번호(정확 일치)
    if (!auditorium) return { error: '상영관(auditorium) 칸이 비어 있고 별칭 매핑도 없습니다.' };
    const byName = await db.query<{ id: number; label: string }>(
      `SELECT a.id, l.name || ' ' || a.auditorium_no AS label
       FROM auditoriums a
       JOIN cinema_locations l ON l.id = a.location_id
       WHERE l.name LIKE '%' || ? || '%' AND a.auditorium_no = ?`,
      [theater, auditorium],
    );
    if (byName.length === 1) return byName[0];
    if (byName.length > 1) return { error: `'${theater} ${auditorium}'가 여러 상영관과 일치합니다.` };
    return { error: `상영관을 찾을 수 없습니다: '${theater} ${auditorium}' (별칭 등록 또는 극장명·관 번호 확인)` };
  }

  async function importCsv(
    text: string,
    opts: AdminServiceOptions & { commit?: boolean } = {},
  ): Promise<ImportResult> {
    const commit = opts.commit ?? false;
    const grid = parseCsv(text);
    const headerErrors: string[] = [];
    if (grid.length === 0) headerErrors.push('CSV가 비어 있습니다.');
    const header = grid.length > 0 ? normalizeHeader(grid[0]) : [];
    for (const col of REQUIRED_COLUMNS) {
      if (!header.includes(col)) headerErrors.push(`필수 컬럼 누락: ${col}`);
    }
    if (headerErrors.length > 0) {
      return {
        ok: false,
        committed: false,
        headerErrors,
        summary: { total: 0, ready: 0, errors: 0, created: 0 },
        rows: [],
      };
    }

    const col = (cells: string[], name: string) => {
      const idx = header.indexOf(name);
      return idx >= 0 ? (cells[idx] ?? '').trim() : '';
    };

    const rows: ImportRowResult[] = [];
    for (let i = 1; i < grid.length; i += 1) {
      const cells = grid[i];
      const raw: Record<string, string> = {};
      for (const name of [...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS]) raw[name] = col(cells, name);
      const errors: string[] = [];
      const warnings: string[] = [];

      const provider = raw.provider || 'csv_import';
      const format = raw.format.toLowerCase();
      const verificationStatus = raw.verificationstatus ? raw.verificationstatus.toLowerCase() : 'verified';

      if (!raw.movie) errors.push('movie가 비어 있습니다.');
      if (!raw.theater) errors.push('theater가 비어 있습니다.');
      if (!YMD.test(raw.showdate)) errors.push('showDate는 YYYY-MM-DD 형식이어야 합니다.');
      if (!HHMM.test(raw.startsat)) errors.push('startsAt은 HH:MM(Asia/Seoul) 형식이어야 합니다.');
      if (!(SHOWTIME_FORMATS as readonly string[]).includes(format))
        errors.push(`format은 ${SHOWTIME_FORMATS.join('/')} 중 하나여야 합니다.`);
      const price = Number(raw.price);
      if (!Number.isInteger(price) || price < 0 || price > 1_000_000)
        errors.push('price는 0~1,000,000 사이의 정수여야 합니다.');
      if (!isHttpUrl(raw.sourceurl)) errors.push('sourceUrl은 유효한 http(s) URL이어야 합니다(필수).');
      const checkedAtMs = new Date(raw.checkedat).getTime();
      if (!raw.checkedat || Number.isNaN(checkedAtMs)) errors.push('checkedAt은 ISO 날짜/시각이어야 합니다(필수).');
      if (raw.expiresat && Number.isNaN(new Date(raw.expiresat).getTime()))
        errors.push('expiresAt이 있으면 ISO 날짜/시각이어야 합니다.');
      if (!(VERIFICATION_STATUSES as readonly string[]).includes(verificationStatus))
        errors.push(`verificationStatus는 ${VERIFICATION_STATUSES.join('/')} 중 하나여야 합니다.`);

      let resolved: ImportRowResult['resolved'];
      if (errors.length === 0) {
        const movie = await resolveMovie(raw.movie);
        if (!movie) errors.push(`영화를 찾을 수 없습니다: '${raw.movie}' (제목 또는 별칭)`);
        const aud = await resolveAuditorium(raw.theater, raw.auditorium);
        if ('error' in aud) errors.push(aud.error);
        if (movie && !('error' in aud)) {
          const input: AdminShowtimeInput = {
            movieId: movie.id,
            auditoriumId: aud.id,
            date: raw.showdate,
            startTime: raw.startsat,
            endTime: undefined,
            crossesMidnight: false,
            format: format as AdminShowtimeInput['format'],
            is3d: false,
            language: 'sub',
            price,
            bookingUrl: raw.sourceurl,
            sourceUrl: raw.sourceurl,
            expiresAt: raw.expiresat || undefined,
            verificationStatus: verificationStatus as AdminShowtimeInput['verificationStatus'],
            sourceNote: `CSV import (${provider})`,
            infoStatus: 'official',
            isSynthetic: false, // CSV import는 항상 실제 회차 — 합성과 혼합 금지
            status: 'active',
            adminNote: undefined,
            mismatchNote: undefined,
          };
          const v = await adminService.validateShowtime(input, { now: opts.now });
          errors.push(...v.errors);
          warnings.push(...v.warnings);
          if (v.starts) {
            resolved = {
              movieId: movie.id,
              movieTitle: movie.title,
              auditoriumId: aud.id,
              auditoriumLabel: aud.label,
              startsAtIso: v.starts.toISOString(),
            };
          }
          if (errors.length === 0 && commit) {
            const created = await adminService.createShowtime(input, {
              now: opts.now,
              actor: opts.actor ?? 'admin(csv)',
              provider,
              checkedAt: new Date(raw.checkedat).toISOString(),
            });
            if (created.ok) {
              rows.push({ line: i + 1, raw, status: 'created', errors, warnings, resolved, createdId: created.id });
              continue;
            }
            errors.push(...created.errors);
          }
        }
      }

      rows.push({ line: i + 1, raw, status: errors.length > 0 ? 'error' : 'ready', errors, warnings, resolved });
    }

    const summary = {
      total: rows.length,
      ready: rows.filter((r) => r.status === 'ready').length,
      errors: rows.filter((r) => r.status === 'error').length,
      created: rows.filter((r) => r.status === 'created').length,
    };
    return { ok: true, committed: commit, headerErrors: [], summary, rows };
  }

  return { importCsv, resolveMovie, resolveAuditorium };
}

const defaultService = createShowtimeImportService(getAppDbClient);
export const importShowtimeCsv = defaultService.importCsv;
