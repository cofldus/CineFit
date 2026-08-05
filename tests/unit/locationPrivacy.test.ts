// R21.1 §4 — 위치정보 최소화: 저장 축약·라벨 일반화·보존기간 scrub.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createRecommendationRepository } from '../../src/data/recommendationRepository';
import { createSqliteClient } from '../../src/data/client/sqliteClient';
import { coarseGridId, sanitizeOriginForStorage } from '../../src/lib/locationPrivacy';

describe('sanitizeOriginForStorage', () => {
  it('좌표를 소수 3자리로 축약한다 (~110m)', () => {
    const s = sanitizeOriginForStorage({ lat: 37.5665123, lng: 126.9779876, label: '현재 위치' });
    expect(s.lat).toBe(37.567);
    expect(s.lng).toBe(126.978);
  });

  it('화이트리스트 밖 라벨(주소 등 자유 입력)은 일반화한다', () => {
    expect(sanitizeOriginForStorage({ lat: 37.5, lng: 127, label: '서울시 강남구 테헤란로 1' }).label).toBe(
      '사용자 지정 위치',
    );
    expect(sanitizeOriginForStorage({ lat: 37.5, lng: 127, label: '서울시청 인근' }).label).toBe('서울시청 인근');
  });
});

describe('scrubOldRunLocations', () => {
  it('보존기간 지난 실행의 좌표를 삭제하고 grid ID만 남긴다(멱등)', async () => {
    const db = createSqliteClient(':memory:');
    await db.exec(readFileSync(join(process.cwd(), 'spikes', 'minimal-db', 'schema.sql'), 'utf8'));
    const dir = join(process.cwd(), 'db', 'migrations');
    for (const f of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
      await db.exec(readFileSync(join(dir, f), 'utf8'));
    }
    const repo = createRecommendationRepository(() => db);

    const oldRequest = JSON.stringify({
      movieId: 1,
      origin: { lat: 37.567, lng: 126.978, label: '현재 위치' },
      date: '2026-07-01',
    });
    await db.run(
      `INSERT INTO recommendation_runs (user_id, request, weights, results, created_at) VALUES (?,?,?,?,?)`,
      ['demo-user', oldRequest, '{}', '[]', '2026-06-01T00:00:00.000Z'],
    );
    await db.run(
      `INSERT INTO recommendation_runs (user_id, request, weights, results, created_at) VALUES (?,?,?,?,?)`,
      ['demo-user', oldRequest, '{}', '[]', '2026-07-27T00:00:00.000Z'], // 보존기간 이내
    );

    const now = new Date('2026-07-28T00:00:00.000Z');
    const changed = await repo.scrubOldRunLocations(now, 30);
    expect(changed).toBe(1);

    const rows = await db.query<{ request: string; created_at: string }>(
      `SELECT request, created_at FROM recommendation_runs ORDER BY id`,
    );
    const scrubbed = JSON.parse(rows[0].request) as { origin: Record<string, unknown> };
    expect(scrubbed.origin.lat).toBeUndefined();
    expect(scrubbed.origin.lng).toBeUndefined();
    expect(scrubbed.origin.scrubbed).toBe(true);
    expect(scrubbed.origin.gridId).toBe(coarseGridId(37.567, 126.978));
    // 이내 데이터는 그대로.
    expect((JSON.parse(rows[1].request) as { origin: { lat: number } }).origin.lat).toBe(37.567);
    // 멱등 — 두 번째 실행은 변경 없음.
    expect(await repo.scrubOldRunLocations(now, 30)).toBe(0);
    await db.close();
  });
});
