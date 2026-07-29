// 보존 정책 서비스 회귀 테스트 — 임시 DB 직접 시드, 나이 기준 삭제와 고아 세션 정리를 확인한다
import { execSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

process.env.CINEFIT_DB_PATH = join(mkdtempSync(join(tmpdir(), 'cinefit-retention-')), 'retention-test.db');

import { getAppDbClient } from '../../src/data/client/index';
import { retentionService } from '../../src/data/retentionService';

let showtimeId: number;

beforeAll(async () => {
  const env = { ...process.env };
  execSync('node spikes/minimal-db/seed.mjs', { env });
  execSync('node db/migrate.mjs', { env });

  const db = getAppDbClient();
  const [movie] = await db.query<{ id: number }>(`SELECT id FROM movies LIMIT 1`);
  const [auditorium] = await db.query<{ id: number }>(`SELECT id FROM auditoriums LIMIT 1`);
  const rows = await db.query<{ id: number }>(
    `INSERT INTO showtimes
       (movie_id, auditorium_id, starts_at, ends_at_est, format, price_adult,
        entry_method, data_checked_at, info_status, status, is_synthetic)
     VALUES (?,?,'2026-01-01T19:00:00+09:00','2026-01-01T21:30:00+09:00','standard',15000,'manual',
             '2026-01-01T19:00:00+09:00','official','active',0) RETURNING id`,
    [movie.id, auditorium.id],
  );
  showtimeId = rows[0].id;
});

async function insertSession(id: string, lastSeenAt: string) {
  const db = getAppDbClient();
  await db.run(`INSERT INTO analytics_sessions (id, first_seen_at, last_seen_at) VALUES (?,?,?)`, [id, lastSeenAt, lastSeenAt]);
}

const NOW = new Date('2026-07-28T00:00:00+09:00');
// 실제 앱 코드는 항상 now.toISOString()(UTC, Z 접미사)로 저장한다(src/data/client/types.ts) —
// 테스트 픽스처도 같은 형식으로 넣어야 dateColumn < cutoff 문자열 비교가 실제 운영과 같게 동작한다.
const OLD = new Date('2026-01-01T00:00:00+09:00').toISOString(); // NOW보다 90일 이상 과거
const RECENT = new Date('2026-07-20T00:00:00+09:00').toISOString(); // NOW보다 90일 이내

describe('retentionService.preview / apply — 나이 기준 삭제', () => {
  it('오래된 analytics_events만 삭제 대상으로 잡히고, 최근 것은 남는다', async () => {
    const db = getAppDbClient();
    await insertSession('sess-age-1', OLD);
    await db.run(`INSERT INTO analytics_events (session_id, event_name, created_at) VALUES (?,?,?)`, [
      'sess-age-1',
      'app_opened',
      OLD,
    ]);
    await db.run(`INSERT INTO analytics_events (session_id, event_name, created_at) VALUES (?,?,?)`, [
      'sess-age-1',
      'app_opened',
      RECENT,
    ]);

    const preview = await retentionService.preview(NOW);
    expect(preview.analytics_events).toBeGreaterThanOrEqual(1);

    const before = await db.query<{ n: number }>(`SELECT COUNT(*) AS n FROM analytics_events WHERE session_id = ?`, ['sess-age-1']);
    expect(Number(before[0].n)).toBe(2);

    const applied = await retentionService.apply(NOW, 'test-actor');
    expect(applied.analytics_events).toBeGreaterThanOrEqual(1);

    const after = await db.query<{ n: number; created_at: string }>(
      `SELECT COUNT(*) AS n FROM analytics_events WHERE session_id = ?`,
      ['sess-age-1'],
    );
    expect(Number(after[0].n)).toBe(1); // 최근 이벤트 1건만 남는다

    const remaining = await db.query<{ created_at: string }>(`SELECT created_at FROM analytics_events WHERE session_id = ?`, [
      'sess-age-1',
    ]);
    expect(new Date(remaining[0].created_at).toISOString()).toBe(new Date(RECENT).toISOString());
  });

  it('preview는 실제로 지우지 않는다', async () => {
    const db = getAppDbClient();
    await db.run(`INSERT INTO booking_link_checks (showtime_id, status, checked_at) VALUES (?,?,?)`, [
      showtimeId,
      'valid',
      new Date('2025-01-01T00:00:00+09:00').toISOString(), // 180일보다 훨씬 과거
    ]);
    const before = await db.query<{ n: number }>(`SELECT COUNT(*) AS n FROM booking_link_checks`);

    const preview = await retentionService.preview(NOW);
    expect(preview.booking_link_checks).toBeGreaterThanOrEqual(1);

    const after = await db.query<{ n: number }>(`SELECT COUNT(*) AS n FROM booking_link_checks`);
    expect(Number(after[0].n)).toBe(Number(before[0].n)); // preview는 아무것도 지우지 않았다
  });

  it('audit_logs에 retention_apply 이벤트가 남는다', async () => {
    await retentionService.apply(NOW, 'test-actor-2');
    const db = getAppDbClient();
    // NOW가 고정 시각이라 두 번의 apply() 호출이 같은 created_at을 남긴다 — id(자동 증가)로
    // 최신 행을 가려낸다(created_at DESC는 동률일 때 순서를 보장하지 않는다).
    const rows = await db.query<{ actor: string }>(
      `SELECT actor FROM audit_logs WHERE action = 'retention_apply' ORDER BY id DESC LIMIT 1`,
    );
    expect(rows[0].actor).toBe('test-actor-2');
  });
});

describe('retentionService.apply — 고아 세션 정리', () => {
  it('참조가 전혀 없는 오래된 세션은 지우고, recommendation_runs 연결은 끊는다', async () => {
    const db = getAppDbClient();
    await insertSession('sess-orphan-1', OLD);
    const runRows = await db.query<{ id: number }>(
      `INSERT INTO recommendation_runs (request, weights, results, session_id, created_at)
       VALUES ('{}','{}','[]',?,?) RETURNING id`,
      ['sess-orphan-1', OLD],
    );

    await retentionService.apply(NOW, 'test-actor-3');

    const sessionRows = await db.query<{ id: string }>(`SELECT id FROM analytics_sessions WHERE id = ?`, ['sess-orphan-1']);
    expect(sessionRows).toHaveLength(0);

    const runAfter = await db.query<{ session_id: string | null }>(`SELECT session_id FROM recommendation_runs WHERE id = ?`, [
      runRows[0].id,
    ]);
    expect(runAfter[0].session_id).toBeNull();
  });

  it('아직 참조가 남아있는(예: 미만료 alpha_consents) 오래된 세션은 지우지 않는다', async () => {
    const db = getAppDbClient();
    await insertSession('sess-keep-1', OLD);
    await db.run(`INSERT INTO alpha_consents (session_id, consented_at) VALUES (?,?)`, ['sess-keep-1', OLD]);

    await retentionService.apply(NOW, 'test-actor-4');

    const sessionRows = await db.query<{ id: string }>(`SELECT id FROM analytics_sessions WHERE id = ?`, ['sess-keep-1']);
    expect(sessionRows).toHaveLength(1);
  });
});
