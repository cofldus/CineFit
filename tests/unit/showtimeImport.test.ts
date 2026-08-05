// R21 §2 — 회차 CSV import: 매핑(제목·alias)·필수 필드·중복 방지·commit·자동 만료.
// 격리 in-memory SQLite에 스키마+마이그레이션을 그대로 적용한다(계약 테스트 패턴).
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { createAdminShowtimeService } from '../../src/data/adminShowtimeService';
import { createShowtimeImportService } from '../../src/data/showtimeImportService';
import { createSqliteClient } from '../../src/data/client/sqliteClient';
import type { DbClient } from '../../src/data/client/types';

const HEADER =
  'provider,theater,auditorium,movie,showDate,startsAt,format,price,sourceUrl,checkedAt,expiresAt,verificationStatus';
const NOW = () => new Date('2026-07-27T12:00:00+09:00');

async function makeDb(): Promise<DbClient> {
  const db = createSqliteClient(':memory:');
  await db.exec(readFileSync(join(process.cwd(), 'spikes', 'minimal-db', 'schema.sql'), 'utf8'));
  const dir = join(process.cwd(), 'db', 'migrations');
  for (const f of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
    await db.exec(readFileSync(join(dir, f), 'utf8'));
  }
  return db;
}

async function seed(db: DbClient) {
  const id = async (sql: string, params: unknown[] = []) => (await db.query<{ id: number }>(sql, params))[0].id;
  const movieId = await id(
    `INSERT INTO movies (title, runtime_min, genres, kobis_code, created_at)
     VALUES ('임포트 영화', 120, '["드라마"]', 'IM0001', '2026-07-01T00:00:00.000Z') RETURNING id`,
  );
  await db.run(
    `INSERT INTO movie_releases (movie_id, country, status, release_date, info_status, observed_at, confidence)
     VALUES (?,?,?,?,?,?,?)`,
    [movieId, 'KR', 'domestic_release', '2026-01-01', 'official', '2026-07-01', 1.0],
  );
  await db.run(
    `INSERT INTO movie_format_versions (movie_id, raw_value, normalized_value, source_type, source_name, info_status, observed_at)
     VALUES (?,?,?,?,?,?,?)`,
    [movieId, 'IMAX', 'imax', 'official_api', 'KOBIS', 'official', '2026-07-01T00:00:00.000Z'],
  );
  await db.run(`INSERT INTO movie_aliases (movie_id, alias) VALUES (?, '임영')`, [movieId]);
  const locationId = await id(
    `INSERT INTO cinema_locations (chain, name, lat, lng, status) VALUES ('CGV','임포트 극장',37.5,127.0,'operating') RETURNING id`,
  );
  const auditoriumId = await id(
    `INSERT INTO auditoriums (location_id, auditorium_no, brand, status, seat_count) VALUES (?,?,?,?,?) RETURNING id`,
    [locationId, 'IMAX관', 'imax', 'operating', 300],
  );
  await db.run(`INSERT INTO auditorium_aliases (auditorium_id, alias) VALUES (?, '임아맥')`, [auditoriumId]);
  return { movieId, locationId, auditoriumId };
}

const validRow = (over: Partial<Record<string, string>> = {}) => {
  const v = {
    provider: 'cgv_official',
    theater: '임포트 극장',
    auditorium: 'IMAX관',
    movie: '임포트 영화',
    showdate: '2026-08-02',
    startsat: '19:00',
    format: 'imax',
    price: '28000',
    sourceurl: 'https://cgv.example/confirm',
    checkedat: '2026-07-27T10:00:00+09:00',
    expiresat: '',
    verificationstatus: 'verified',
    ...over,
  };
  return [
    v.provider, v.theater, v.auditorium, v.movie, v.showdate, v.startsat,
    v.format, v.price, v.sourceurl, v.checkedat, v.expiresat, v.verificationstatus,
  ].join(',');
};

describe('showtimeImportService', () => {
  let db: DbClient;
  const getDb = () => db;

  beforeEach(async () => {
    db = await makeDb();
    await seed(db);
  });

  it('필수 컬럼이 빠진 헤더는 headerErrors로 거부한다', async () => {
    const svc = createShowtimeImportService(getDb);
    const r = await svc.importCsv('theater,movie\nA,B', { now: NOW });
    expect(r.ok).toBe(false);
    expect(r.headerErrors.join(' ')).toContain('sourceurl');
  });

  it('preview: 유효 행은 ready + 매핑 정보를 채운다 (commit 안 함)', async () => {
    const svc = createShowtimeImportService(getDb);
    const r = await svc.importCsv(`${HEADER}\n${validRow()}`, { now: NOW });
    expect(r.summary).toEqual({ total: 1, ready: 1, errors: 0, created: 0 });
    expect(r.rows[0].resolved?.movieTitle).toBe('임포트 영화');
    expect(r.rows[0].resolved?.auditoriumLabel).toBe('임포트 극장 IMAX관');
    expect((await db.query(`SELECT id FROM showtimes`)).length).toBe(0);
  });

  it('영화·상영관 alias로도 매핑된다', async () => {
    const svc = createShowtimeImportService(getDb);
    const r = await svc.importCsv(
      `${HEADER}\n${validRow({ movie: '임영', theater: '임아맥', auditorium: '' })}`,
      { now: NOW },
    );
    expect(r.rows[0].status).toBe('ready');
    expect(r.rows[0].resolved?.auditoriumLabel).toBe('임포트 극장 IMAX관');
  });

  it('sourceUrl·checkedAt이 없거나 잘못되면 오류 행이 된다', async () => {
    const svc = createShowtimeImportService(getDb);
    const r = await svc.importCsv(
      `${HEADER}\n${validRow({ sourceurl: '' })}\n${validRow({ startsat: '20:00', checkedat: 'not-a-date' })}`,
      { now: NOW },
    );
    expect(r.summary.errors).toBe(2);
    expect(r.rows[0].errors.join(' ')).toContain('sourceUrl');
    expect(r.rows[1].errors.join(' ')).toContain('checkedAt');
  });

  it('commit: 실제 회차로 저장되고 provider·sourceUrl·checkedAt·이력이 남는다', async () => {
    const svc = createShowtimeImportService(getDb);
    const r = await svc.importCsv(`${HEADER}\n${validRow()}`, { now: NOW, commit: true });
    expect(r.summary.created).toBe(1);
    const row = (
      await db.query<{
        provider: string;
        source_url: string;
        data_checked_at: string;
        is_synthetic: number;
        verification_status: string;
      }>(`SELECT provider, source_url, data_checked_at, is_synthetic, verification_status FROM showtimes`)
    )[0];
    expect(row.provider).toBe('cgv_official');
    expect(row.source_url).toBe('https://cgv.example/confirm');
    expect(row.is_synthetic).toBe(0); // 합성과 완전 분리
    expect(row.verification_status).toBe('verified');
    expect(new Date(row.data_checked_at).toISOString()).toBe(new Date('2026-07-27T10:00:00+09:00').toISOString());
    const changes = await db.query<{ actor: string; action: string }>(`SELECT actor, action FROM showtime_changes`);
    expect(changes[0]).toEqual({ actor: 'admin(csv)', action: 'create' });
  });

  it('같은 회차를 다시 commit하면 중복으로 거부된다', async () => {
    const svc = createShowtimeImportService(getDb);
    await svc.importCsv(`${HEADER}\n${validRow()}`, { now: NOW, commit: true });
    const again = await svc.importCsv(`${HEADER}\n${validRow()}`, { now: NOW, commit: true });
    expect(again.summary.created).toBe(0);
    expect(again.rows[0].errors.join(' ')).toContain('이미 존재');
  });

  it('과거 시각 회차는 거부된다', async () => {
    const svc = createShowtimeImportService(getDb);
    const r = await svc.importCsv(`${HEADER}\n${validRow({ showdate: '2026-07-01' })}`, { now: NOW });
    expect(r.rows[0].errors.join(' ')).toContain('과거');
  });
});

describe('expirePastShowtimes (R21 자동 만료)', () => {
  it('만료 시각(없으면 시작 시각)이 지난 회차를 expired로 표시한다', async () => {
    const db = await makeDb();
    await seed(db);
    const importSvc = createShowtimeImportService(() => db);
    await importSvc.importCsv(`${HEADER}\n${validRow()}`, { now: NOW, commit: true });

    const adminSvc = createAdminShowtimeService(() => db);
    // 상영 시작(2026-08-02 19:00 KST) 이후 시점으로 시간을 돌리면 만료된다.
    const after = () => new Date('2026-08-03T12:00:00+09:00');
    const changed = await adminSvc.expirePastShowtimes({ now: after });
    expect(changed).toBe(1);
    const rows = await db.query<{ verification_status: string }>(`SELECT verification_status FROM showtimes`);
    expect(rows[0].verification_status).toBe('expired');
    // 두 번째 실행은 변경 없음(멱등).
    expect(await adminSvc.expirePastShowtimes({ now: after })).toBe(0);
  });
});
