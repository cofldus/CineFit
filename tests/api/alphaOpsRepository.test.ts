// 알파 운영 대시보드 데이터 회귀 테스트 — 임시 DB 직접 시드
import { execSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

process.env.CINEFIT_DB_PATH = join(mkdtempSync(join(tmpdir(), 'cinefit-alphaops-')), 'alphaops-test.db');

import { alphaOpsRepository } from '../../src/data/alphaOpsRepository';
import { getAppDbClient } from '../../src/data/client/index';

const iso = (s: string) => new Date(s).toISOString();

beforeAll(async () => {
  const env = { ...process.env };
  execSync('node spikes/minimal-db/seed.mjs', { env });
  execSync('node db/migrate.mjs', { env });

  const db = getAppDbClient();

  await db.run(`INSERT INTO invite_codes (code, active, created_by, created_at) VALUES (?,?,?,?)`, [
    'ACTIVE1',
    1,
    'admin',
    iso('2026-07-01T00:00:00+09:00'),
  ]);
  await db.run(`INSERT INTO invite_codes (code, active, created_by, created_at) VALUES (?,?,?,?)`, [
    'INACTIVE1',
    0,
    'admin',
    iso('2026-07-01T00:00:00+09:00'),
  ]);
  const codeRows = await db.query<{ id: number }>(`SELECT id FROM invite_codes WHERE code = 'ACTIVE1'`);

  for (const sessionId of ['sess-ops-1', 'sess-ops-2', 'sess-ops-3']) {
    await db.run(`INSERT INTO analytics_sessions (id, first_seen_at, last_seen_at) VALUES (?,?,?)`, [
      sessionId,
      iso('2026-07-01T00:00:00+09:00'),
      iso('2026-07-01T00:00:00+09:00'),
    ]);
  }
  await db.run(`INSERT INTO invite_code_redemptions (invite_code_id, session_id, redeemed_at) VALUES (?,?,?)`, [
    codeRows[0].id,
    'sess-ops-1',
    iso('2026-07-01T00:00:00+09:00'),
  ]);
  await db.run(`INSERT INTO invite_code_redemptions (invite_code_id, session_id, redeemed_at) VALUES (?,?,?)`, [
    codeRows[0].id,
    'sess-ops-2',
    iso('2026-07-01T00:00:00+09:00'),
  ]);
  await db.run(`INSERT INTO alpha_consents (session_id, consented_at) VALUES (?,?)`, [
    'sess-ops-1',
    iso('2026-07-01T00:00:00+09:00'),
  ]);

  const events: [string, string][] = [
    ['sess-ops-1', 'app_opened'],
    ['sess-ops-2', 'app_opened'],
    ['sess-ops-3', 'app_opened'],
    ['sess-ops-1', 'movie_selected'],
    ['sess-ops-2', 'movie_selected'],
    ['sess-ops-1', 'recommendation_started'],
  ];
  for (const [sessionId, eventName] of events) {
    await db.run(`INSERT INTO analytics_events (session_id, event_name, created_at) VALUES (?,?,?)`, [
      sessionId,
      eventName,
      iso('2026-07-01T00:00:00+09:00'),
    ]);
  }
});

describe('alphaOpsRepository.getSummary', () => {
  it('초대 코드 현황을 집계한다', async () => {
    const summary = await alphaOpsRepository.getSummary();
    expect(summary.inviteCodes.totalCodes).toBe(2);
    expect(summary.inviteCodes.activeCodes).toBe(1);
    expect(summary.inviteCodes.totalRedemptions).toBe(2);
    expect(summary.inviteCodes.distinctRedeemedSessions).toBe(2);
  });

  it('세션·동의 현황을 집계한다', async () => {
    const summary = await alphaOpsRepository.getSummary();
    expect(summary.consent.totalSessions).toBe(3);
    expect(summary.consent.consentedSessions).toBe(1);
    expect(summary.consent.consentRatePercent).toBeCloseTo(33.3, 1);
  });

  it('사용 퍼널을 이벤트 이름별 고유 세션 수로 집계한다', async () => {
    const summary = await alphaOpsRepository.getSummary();
    const byKey = Object.fromEntries(summary.funnel.map((f) => [f.key, f.sessionCount]));
    expect(byKey.app_opened).toBe(3);
    expect(byKey.movie_selected).toBe(2);
    expect(byKey.recommendation_started).toBe(1);
    expect(byKey.recommendation_completed).toBe(0);
    expect(byKey.feedback_submitted).toBe(0);

    const movieSelected = summary.funnel.find((f) => f.key === 'movie_selected')!;
    expect(movieSelected.percentOfFirst).toBeCloseTo(66.7, 1);
  });
});
