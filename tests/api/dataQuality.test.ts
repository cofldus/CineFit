// dataQualityRepository 회귀 테스트 — 임시 DB에 실제 시드 데이터로 집계 로직을 검증한다
import { execSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

process.env.CINEFIT_DB_PATH = join(mkdtempSync(join(tmpdir(), 'cinefit-quality-')), 'quality-test.db');
process.env.CINEFIT_CLOCK_MODE = 'demo';

import { COMPLETENESS_LEVELS } from '../../src/domain/dataQuality/completeness';
import { getAppDbClient } from '../../src/data/client/index';
import { dataQualityRepository } from '../../src/data/dataQualityRepository';
import { getAppClock } from '../../src/lib/clock';

beforeAll(() => {
  const env = { ...process.env };
  execSync('node spikes/minimal-db/seed.mjs', { env });
  execSync('node db/migrate.mjs', { env });
  execSync('node db/seed-seat-zones.mjs', { env });
  execSync('node db/seed-aliases.mjs', { env });
});

describe('상영관 완성도 집계', () => {
  it('operating 상태 상영관 전체에 대해 각 하나의 결과를 낸다', async () => {
    const db = getAppDbClient();
    const [{ n }] = await db.query<{ n: number }>(`SELECT COUNT(*) AS n FROM auditoriums WHERE status='operating'`);
    const rows = await dataQualityRepository.getAuditoriumQuality(getAppClock().now());
    expect(rows).toHaveLength(n);
    for (const row of rows) {
      expect(COMPLETENESS_LEVELS).toContain(row.level);
    }
  });

  it('현재 유효 사양(source_id NULL)이 있으면 "출처" 누락으로 표시된다', async () => {
    const db = getAppDbClient();
    const [{ id: targetId }] = await db.query<{ id: number }>(`SELECT id FROM auditoriums LIMIT 1`);
    await db.run(`UPDATE auditorium_specs SET source_id = NULL WHERE auditorium_id = ? AND valid_to IS NULL`, [
      targetId,
    ]);
    const rows = await dataQualityRepository.getAuditoriumQuality(getAppClock().now());
    const target = rows.find((r) => r.auditoriumId === targetId)!;
    expect(target.missing).toContain('출처');
  });
});

describe('영화·회차 통계', () => {
  it('확인된 영화 사양 수는 전체 영화 수 이하다', async () => {
    const stats = await dataQualityRepository.getMovieSpecStats();
    expect(stats.totalMovies).toBeGreaterThan(0);
    expect(stats.moviesWithVerifiedSpec).toBeLessThanOrEqual(stats.totalMovies);
  });

  it('활성 회차 수는 합성 회차 수 이상이다', async () => {
    const stats = await dataQualityRepository.getShowtimeStats();
    expect(stats.activeCount).toBeGreaterThanOrEqual(stats.syntheticCount);
  });
});

describe('최근 추천 실행 통계', () => {
  it('실행 기록이 없으면 저신뢰 비율은 null이다', async () => {
    const stats = await dataQualityRepository.getRecentRunStats();
    expect(stats.totalRuns).toBe(0);
    expect(stats.lowConfidenceCandidateRate).toBeNull();
  });

  it('추천 없음 실행과 저신뢰 후보를 올바르게 집계한다', async () => {
    const db = getAppDbClient();
    const now = new Date().toISOString();
    await db.run(
      `INSERT INTO recommendation_runs (user_id, request, weights, results, latency_ms, policy_version, code_version, created_at)
       VALUES ('demo-user','{}','{}','[]',5,'v1','0.2.0',?)`,
      [now],
    );
    await db.run(
      `INSERT INTO recommendation_runs (user_id, request, weights, results, latency_ms, policy_version, code_version, created_at)
       VALUES ('demo-user','{}','{}',?,5,'v1','0.2.0',?)`,
      [JSON.stringify([{ confidenceLabel: '낮음' }, { confidenceLabel: '높음' }]), now],
    );

    const stats = await dataQualityRepository.getRecentRunStats();
    expect(stats.totalRuns).toBe(2);
    expect(stats.noResultsCount).toBe(1);
    expect(stats.lowConfidenceCandidateRate).toBeCloseTo(0.5);
  });
});
