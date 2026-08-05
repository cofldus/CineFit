// 리포지토리 계약 테스트 — 동일 스위트를 SQLite와 PostgreSQL에 실행한다.
// PostgreSQL: CINEFIT_TEST_PG_URL 설정 시에만 실행 (로컬: cinefit_test DB, CI: service container).
// 운영·Supabase DB를 절대 대상으로 하지 않는다.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createAdminShowtimeService } from '../../src/data/adminShowtimeService';
import { createPostgresClient } from '../../src/data/client/postgresClient';
import { createSqliteClient } from '../../src/data/client/sqliteClient';
import type { DbClient } from '../../src/data/client/types';
import { createMovieRepository } from '../../src/data/movieRepository';
import { createReportPromotionService } from '../../src/data/reportPromotionService';
import { createReportService } from '../../src/data/reportService';
import { createSeatZoneRepository } from '../../src/data/seatZoneRepository';
import { createShowtimeRepository } from '../../src/data/showtimeRepository';

const PG_URL = process.env.CINEFIT_TEST_PG_URL;

async function loadSqliteSchema(db: DbClient) {
  await db.exec(readFileSync(join(process.cwd(), 'spikes', 'minimal-db', 'schema.sql'), 'utf8'));
  const dir = join(process.cwd(), 'db', 'migrations');
  for (const f of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
    await db.exec(readFileSync(join(dir, f), 'utf8'));
  }
}

async function loadPgSchema(db: DbClient) {
  await db.exec('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  const dir = join(process.cwd(), 'db', 'migrations-postgres');
  for (const f of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
    await db.exec(readFileSync(join(dir, f), 'utf8'));
  }
}

interface Fixture {
  sourceId: number;
  movieId: number;
  locationId: number;
  auditoriumId: number;
}

async function seedFixture(db: DbClient): Promise<Fixture> {
  const id = async (sql: string, params: unknown[]) =>
    (await db.query<{ id: number }>(sql, params))[0].id;

  const sourceId = await id(
    `INSERT INTO sources (kind, name, trust_weight) VALUES ('community','계약테스트출처',0.5) RETURNING id`,
    [],
  );
  const movieId = await id(
    `INSERT INTO movies (title, original_title, runtime_min, genres, director, kobis_code, created_at)
     VALUES ('계약 영화','Contract Movie',120,'["드라마"]','감독','CT0001',?) RETURNING id`,
    ['2026-07-28T00:00:00.000Z'],
  );
  await db.run(
    `INSERT INTO movie_releases (movie_id, country, status, release_date, info_status, observed_at, confidence)
     VALUES (?,?,?,?,?,?,?)`,
    [movieId, 'KR', 'domestic_release', '2026-01-01', 'official', '2026-07-01', 1.0],
  );
  const locationId = await id(
    `INSERT INTO cinema_locations (chain, name, lat, lng, status) VALUES ('테스트체인','계약 극장',37.5,127.0,'operating') RETURNING id`,
    [],
  );
  const auditoriumId = await id(
    `INSERT INTO auditoriums (location_id, auditorium_no, brand, status, seat_count) VALUES (?,?,?,?,?) RETURNING id`,
    [locationId, '1관', 'imax', 'operating', 300],
  );
  await db.run(
    `INSERT INTO auditorium_specs (auditorium_id, valid_from, projector, screen, sound, supported_ar, masking, info_status, observed_at, confidence)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [
      auditoriumId, '2026-01-01',
      '{"light_source":"laser","resolution":"4k","dual":true}',
      '{"width_m":25,"aspect":"1.90"}', '{"format":"imax_12ch"}',
      '1.90', 'none', 'multi_source', '2026-07-01', 0.85,
    ],
  );
  await db.run(
    `INSERT INTO movie_format_versions (movie_id, raw_value, normalized_value, source_type, source_name, info_status, observed_at)
     VALUES (?,?,?,?,?,?,?)`,
    [movieId, 'IMAX/IMAX', 'imax', 'official_api', 'KOBIS', 'official', '2026-07-27T00:00:00.000Z'],
  );
  return { sourceId, movieId, locationId, auditoriumId };
}

function runContracts(providerName: string, makeDb: () => Promise<DbClient>, closeDb: (db: DbClient) => Promise<void>) {
  describe(`Repository 계약 — ${providerName}`, () => {
    let db: DbClient;
    let fx: Fixture;
    const getDb = () => db;

    beforeEach(async () => {
      db = await makeDb();
      fx = await seedFixture(db);
    });

    // beforeEach가 매 테스트마다 새 커넥션 풀을 만든다 — afterAll(스위트 끝) 대신 afterEach로
    // 매번 닫아야 한다. 이전에는 afterAll만 있어 테스트마다 풀이 하나씩 새는 버그였다(로컬
    // PostgreSQL의 max_connections를 소진해 다른 테스트 파일과 동시 실행 시 커넥션 타임아웃을
    // 유발함 — 8차 마일스톤에서 postgresClient에 connectionTimeoutMillis를 추가하며 발견).
    afterEach(async () => {
      if (db) await closeDb(db);
    });

    it('MovieRepositoryContract: 조회·연도·공식 포맷 버전 우선', async () => {
      const repo = createMovieRepository(getDb);
      const movie = await repo.findById(fx.movieId);
      expect(movie).not.toBeNull();
      expect(movie!.title).toBe('계약 영화');
      expect(movie!.releaseYear).toBe(2026);
      expect(movie!.specs.format_versions?.value).toEqual(['imax']);
      expect(movie!.specs.format_versions?.infoStatus).toBe('official');
      expect((await repo.list()).map((m) => m.id)).toContain(fx.movieId);
      expect(await repo.findById(999_999)).toBeNull(); // nullable 일관성
    });

    it('SeatZoneRepositoryContract: JSON 목적 배열 왕복·신뢰도 정렬', async () => {
      const repo = createSeatZoneRepository(getDb);
      await db.run(
        `INSERT INTO seat_zones (auditorium_id, purpose, row_range, info_status, observed_at, confidence) VALUES (?,?,?,?,?,?)`,
        [fx.auditoriumId, '["immersive","sound"]', 'J~L열', 'user_report', '2026-06-15', 0.7],
      );
      await db.run(
        `INSERT INTO seat_zones (auditorium_id, purpose, row_range, info_status, observed_at, confidence) VALUES (?,?,?,?,?,?)`,
        [fx.auditoriumId, '["neck_easy"]', 'N열 이후', 'estimated', '2026-07-01', 0.3],
      );
      const zones = await repo.listByAuditorium(fx.auditoriumId);
      expect(zones).toHaveLength(2);
      expect(zones[0].purposes).toEqual(['immersive', 'sound']); // confidence 내림차순
      expect(Number(zones[0].confidence)).toBeCloseTo(0.7, 5);
    });

    it('ShowtimeRepositoryContract: KST 자정 경계·활성 필터·nullable', async () => {
      const repo = createShowtimeRepository(getDb);
      const insert = (startsIso: string, status: string) =>
        db.run(
          `INSERT INTO showtimes (movie_id, auditorium_id, starts_at, ends_at_est, format, price_adult, data_checked_at, info_status, status, is_synthetic)
           VALUES (?,?,?,?,?,?,?,?,?,1)`,
          [fx.movieId, fx.auditoriumId, startsIso, startsIso, 'imax', 20000, '2026-07-27T00:00:00.000Z', 'estimated', status],
        );
      // 2026-08-01 00:30 KST 심야 회차 = 2026-07-31T15:30Z
      await insert(new Date('2026-08-01T00:30:00+09:00').toISOString(), 'active');
      await insert(new Date('2026-07-31T20:00:00+09:00').toISOString(), 'active');
      await insert(new Date('2026-08-01T12:00:00+09:00').toISOString(), 'disabled');

      const aug1 = await repo.listCandidates(fx.movieId, '2026-08-01');
      expect(aug1).toHaveLength(1); // 심야 회차만 (disabled 제외)
      expect(aug1[0].bookingUrl).toBeNull();
      expect(aug1[0].isSynthetic).toBe(true);
      const jul31 = await repo.listCandidates(fx.movieId, '2026-07-31');
      expect(jul31).toHaveLength(1);
      expect(await repo.listActiveDates(fx.movieId)).toEqual(['2026-07-31', '2026-08-01']);
    });

    it('AdminShowtimeContract: 생성·중복 제약·비활성화·이력', async () => {
      const svc = createAdminShowtimeService(getDb);
      const now = () => new Date('2026-07-27T12:00:00+09:00');
      const input = {
        movieId: fx.movieId, auditoriumId: fx.auditoriumId, date: '2026-08-02', startTime: '19:00',
        endTime: undefined, crossesMidnight: false, format: 'imax' as const, is3d: false,
        language: 'sub' as const, price: 20000, bookingUrl: 'https://example.com/book',
        sourceNote: '계약 테스트', infoStatus: 'official' as const, isSynthetic: false,
        status: 'active' as const, adminNote: undefined, mismatchNote: undefined,
        sourceUrl: undefined, expiresAt: undefined, verificationStatus: 'verified' as const,
      };
      const created = await svc.createShowtime(input, { now });
      expect(created.ok).toBe(true);
      const dup = await svc.createShowtime(input, { now });
      expect(dup.ok).toBe(false);

      const id = (created as { id: number }).id;
      await svc.setShowtimeStatus(id, 'disabled', { now });
      const rows = await svc.listShowtimes({ status: 'disabled' });
      expect(rows.some((r) => r.id === id)).toBe(true);
      const changes = await svc.listChanges(id);
      expect(changes.map((c) => c.action)).toEqual(expect.arrayContaining(['create', 'disable']));
    });

    it('unique 제약: kobis_code 중복 삽입은 실패한다', async () => {
      await expect(
        db.run(`INSERT INTO movies (title, kobis_code) VALUES ('중복', 'CT0001')`),
      ).rejects.toThrow();
    });

    it('transaction rollback: 실패 시 아무것도 남지 않는다', async () => {
      const before = Number((await db.query<{ n: number }>(`SELECT COUNT(*) n FROM movies`))[0].n);
      await expect(
        db.transaction(async (tx) => {
          await tx.run(`INSERT INTO movies (title) VALUES ('롤백 대상')`);
          throw new Error('의도적 실패');
        }),
      ).rejects.toThrow('의도적 실패');
      const after = Number((await db.query<{ n: number }>(`SELECT COUNT(*) n FROM movies`))[0].n);
      expect(after).toBe(before);
    });

    it('pagination: LIMIT/OFFSET 정렬이 동일하다', async () => {
      for (let i = 0; i < 5; i++) {
        await db.run(`INSERT INTO movies (title) VALUES (?)`, [`페이지${i}`]);
      }
      const page = await db.query<{ title: string }>(
        `SELECT title FROM movies WHERE title LIKE '페이지%' ORDER BY title LIMIT 2 OFFSET 2`,
      );
      expect(page.map((r) => r.title)).toEqual(['페이지2', '페이지3']);
    });

    it('ObservationContract: 불변 기록·최신순 조회', async () => {
      const insert = (at: string, value: string) =>
        db.run(
          `INSERT INTO observations (entity_type, entity_id, field, value, source_id, observed_at, info_status, confidence)
           VALUES ('auditorium',?,?,?,?,?,?,?)`,
          [fx.auditoriumId, 'projector.model', JSON.stringify(value), fx.sourceId, at, 'user_report', 0.5],
        );
      await insert('2026-07-01', 'old');
      await insert('2026-07-20', 'new');
      const rows = await db.query<{ value: string }>(
        `SELECT value FROM observations WHERE entity_type='auditorium' AND entity_id=? ORDER BY observed_at DESC`,
        [fx.auditoriumId],
      );
      expect(JSON.parse(rows[0].value)).toBe('new');
    });

    it('ReportPromotionContract: 신뢰도 상한·좌석 존 계보·상태 종결', async () => {
      const reports = createReportService(getDb);
      const promotion = createReportPromotionService(getDb);
      const now = new Date('2026-07-27T12:00:00+09:00');
      const makeReport = (sessionHash: string, evidenceUrl?: string) =>
        reports.create(
          {
            reportType: 'seat_zone', targetType: 'auditorium', targetId: fx.auditoriumId,
            summary: '계약 테스트 좌석 제보', claimedValue: { rowRange: 'J~K열' }, evidenceUrl,
          } as Parameters<typeof reports.create>[0],
          { sessionHash, now },
        );

      // 기존 활성 존 — 승격 시 대체될 대상
      await db.run(
        `INSERT INTO seat_zones (auditorium_id, purpose, row_range, info_status, observed_at, confidence) VALUES (?,?,?,?,?,?)`,
        [fx.auditoriumId, '["immersive"]', 'H~I열', 'estimated', '2026-06-01', 0.3],
      );
      const prevId = (await db.query<{ id: number }>(
        `SELECT id FROM seat_zones WHERE auditorium_id = ? AND is_active = 1`,
        [fx.auditoriumId],
      ))[0].id;

      // 서로 다른 세션 2건 → 복수 일치 상한 0.75
      await makeReport('contract-a');
      const second = await makeReport('contract-b');
      if (!second.ok) throw new Error('제보 생성 실패');
      const promoted = await promotion.promoteSeatZone(
        second.id,
        { purposes: ['immersive', 'subtitle'], rowRange: 'J~K열', rationale: '복수 제보 일치', confidence: 0.95, supersedesSeatZoneId: prevId },
        { actor: 'admin', now },
      );
      expect(promoted.ok).toBe(true);
      if (!promoted.ok) return;
      expect(Number(promoted.confidence)).toBeCloseTo(0.75, 5);

      const old = (await db.query<{ is_active: number; valid_to: string | null }>(
        `SELECT is_active, valid_to FROM seat_zones WHERE id = ?`, [prevId],
      ))[0];
      expect(Number(old.is_active)).toBe(0);
      expect(old.valid_to).not.toBeNull();
      const zones = await createSeatZoneRepository(getDb).listByAuditorium(fx.auditoriumId);
      expect(zones).toHaveLength(1); // 활성 존만 — 대체된 존 제외
      expect(zones[0].supersedesSeatZoneId).toBe(prevId);
      expect(zones[0].infoStatus).toBe('user_report');

      const report = await reports.get(second.id);
      expect(report?.status).toBe('promoted');
      // promoted는 종결 — 재승격·상태 변경 불가
      expect((await promotion.promoteSeatZone(second.id, { purposes: ['immersive'], rationale: '중복', confidence: 0.5 }, { actor: 'admin', now })).ok).toBe(false);
      expect((await reports.review(second.id, 'rejected', { actor: 'admin', now })).ok).toBe(false);

      // 증빙 없는 단일 제보(다른 유형)는 0.55 상한
      const single = await reports.create(
        {
          reportType: 'auditorium_spec', targetType: 'auditorium', targetId: fx.auditoriumId,
          summary: '스크린 사양 계약 제보', claimedValue: { aspect: '1.43' },
        } as Parameters<typeof reports.create>[0],
        { sessionHash: 'contract-c', now },
      );
      if (!single.ok) throw new Error('제보 생성 실패');
      const approved = await promotion.approveAsObservation(single.id, { field: 'screen.aspect', confidence: 0.9 }, { actor: 'admin', now });
      expect(approved.ok).toBe(true);
      if (!approved.ok) return;
      expect(Number(approved.confidence)).toBeCloseTo(0.55, 5);
      const obs = (await db.query<{ info_status: string }>(
        `SELECT info_status FROM observations WHERE id = ?`, [approved.observationId],
      ))[0];
      expect(obs.info_status).toBe('user_report');
    });
  });
}

runContracts(
  'sqlite',
  async () => {
    const db = createSqliteClient(':memory:');
    await loadSqliteSchema(db);
    return db;
  },
  async (db) => db.close(),
);

describe.skipIf(!PG_URL)('PostgreSQL 계약 (CINEFIT_TEST_PG_URL 필요)', () => {
  runContracts(
    'postgres',
    async () => {
      const db = createPostgresClient(PG_URL!);
      await loadPgSchema(db);
      return db;
    },
    async (db) => db.close(),
  );
});
