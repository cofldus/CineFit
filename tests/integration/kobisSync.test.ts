// KOBIS 동기화 통합 테스트 — 임시 SQLite에 스키마+마이그레이션 적용, 외부 API 없이 정규화 값 주입
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { ingestNormalizedMovie } from '../../src/data/adapters/kobis/kobisSyncService.ts';
import type { NormalizedKobisMovie } from '../../src/data/adapters/kobis/kobisTypes.ts';

const NOW = () => new Date('2026-07-27T12:00:00+09:00');

function freshDb(): DatabaseSync {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(join(process.cwd(), 'spikes', 'minimal-db', 'schema.sql'), 'utf8'));
  db.exec(readFileSync(join(process.cwd(), 'db', 'migrations', '001_sync_and_admin.sql'), 'utf8'));
  return db;
}

const dune = (overrides: Partial<NormalizedKobisMovie> = {}): NormalizedKobisMovie => ({
  kobisCode: '20236295',
  title: '듄: 파트2',
  titleEn: 'Dune: Part Two',
  runtimeMin: 165,
  prodYear: 2024,
  openDate: '2024-02-28',
  genres: ['액션'],
  directors: ['드니 빌뇌브'],
  rating: '12세이상관람가',
  formats: [
    { raw: '2D/디지털', normalized: 'standard' },
    { raw: 'IMAX/IMAX', normalized: 'imax' },
  ],
  ...overrides,
});

let db: DatabaseSync;
beforeEach(() => {
  db = freshDb();
});

describe('KOBIS 관찰 로그 → 승격 파이프라인', () => {
  it('신규 영화를 생성하고 관찰 로그·포맷 버전을 남긴다', () => {
    const outcome = ingestNormalizedMovie(dune(), { db, now: NOW });
    expect(outcome).toBe('created');

    const movie = db.prepare(`SELECT * FROM movies WHERE kobis_code='20236295'`).get() as Record<string, unknown>;
    expect(movie.title).toBe('듄: 파트2');
    expect(movie.runtime_min).toBe(165);

    const obs = db.prepare(`SELECT status, data_hash FROM external_observations`).all() as {
      status: string;
    }[];
    expect(obs).toHaveLength(1);
    expect(obs[0].status).toBe('promoted');

    const versions = db
      .prepare(`SELECT raw_value, normalized_value, info_status, source_name FROM movie_format_versions`)
      .all() as Record<string, unknown>[];
    expect(versions).toHaveLength(2);
    expect(versions.every((v) => v.info_status === 'official' && v.source_name === 'KOBIS')).toBe(true);
  });

  it('제목 매칭으로 기존 영화를 갱신하고 kobis_code를 연결한다', () => {
    db.prepare(
      `INSERT INTO movies (title, original_title, runtime_min) VALUES ('듄: 파트 2', 'Dune: Part Two', 166)`,
    ).run();
    const outcome = ingestNormalizedMovie(dune(), { db, now: NOW });
    expect(outcome).toBe('updated');
    const rows = db.prepare(`SELECT title, kobis_code, runtime_min FROM movies`).all() as Record<string, unknown>[];
    expect(rows).toHaveLength(1); // 중복 생성 없음
    expect(rows[0]).toMatchObject({ title: '듄: 파트2', kobis_code: '20236295', runtime_min: 165 });
  });

  it('동일 해시 재수신은 unchanged로 기록하고 중복 승격하지 않는다', () => {
    ingestNormalizedMovie(dune(), { db, now: NOW });
    const outcome = ingestNormalizedMovie(dune(), { db, now: () => new Date('2026-07-28T12:00:00+09:00') });
    expect(outcome).toBe('unchanged');
    const statuses = (db.prepare(`SELECT status FROM external_observations ORDER BY id`).all() as { status: string }[]).map((r) => r.status);
    expect(statuses).toEqual(['promoted', 'unchanged']);
    expect((db.prepare(`SELECT COUNT(*) n FROM movie_format_versions`).get() as { n: number }).n).toBe(2);
  });

  it('변경 재수신은 diff와 함께 갱신한다 (포맷 버전 교체, 중복 없음)', () => {
    ingestNormalizedMovie(dune(), { db, now: NOW });
    const changed = dune({
      runtimeMin: 166,
      formats: [
        { raw: '2D/디지털', normalized: 'standard' },
        { raw: 'IMAX/IMAX', normalized: 'imax' },
        { raw: 'DOLBYCINEMA/DOLBYCINEMA', normalized: 'dolby_cinema' },
      ],
    });
    const outcome = ingestNormalizedMovie(changed, { db, now: () => new Date('2026-07-28T12:00:00+09:00') });
    expect(outcome).toBe('updated');
    const last = db.prepare(`SELECT diff FROM external_observations ORDER BY id DESC LIMIT 1`).get() as { diff: string };
    const diff = JSON.parse(last.diff);
    expect(Object.keys(diff)).toEqual(expect.arrayContaining(['runtimeMin', 'formats']));
    expect((db.prepare(`SELECT COUNT(*) n FROM movie_format_versions`).get() as { n: number }).n).toBe(3);
  });

  it('동명 복수 후보는 승격을 보류하고 error 관찰로 남긴다', () => {
    db.prepare(`INSERT INTO movies (title, runtime_min) VALUES ('듄: 파트2', 166)`).run();
    db.prepare(`INSERT INTO movies (title, runtime_min) VALUES ('듄 파트 2', 120)`).run();
    const outcome = ingestNormalizedMovie(dune({ prodYear: null }), { db, now: NOW });
    expect(outcome).toBe('duplicate');
    expect((db.prepare(`SELECT status FROM external_observations`).get() as { status: string }).status).toBe('error');
    expect((db.prepare(`SELECT COUNT(*) n FROM movies WHERE kobis_code IS NOT NULL`).get() as { n: number }).n).toBe(0);
  });

  it('dry-run은 아무것도 기록하지 않는다', () => {
    const outcome = ingestNormalizedMovie(dune(), { db, now: NOW, dryRun: true });
    expect(outcome).toBe('created');
    expect((db.prepare(`SELECT COUNT(*) n FROM external_observations`).get() as { n: number }).n).toBe(0);
    expect((db.prepare(`SELECT COUNT(*) n FROM movies`).get() as { n: number }).n).toBe(0);
  });
});
