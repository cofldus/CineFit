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

  const events: [string, string, string?][] = [
    ['sess-ops-1', 'app_opened'],
    ['sess-ops-2', 'app_opened'],
    ['sess-ops-3', 'app_opened'],
    ['sess-ops-1', 'movie_selected'],
    ['sess-ops-2', 'movie_selected'],
    // R21 설문 단계 퍼널
    ['sess-ops-1', 'recommend_step1_started'],
    ['sess-ops-1', 'recommend_step1_completed'],
    ['sess-ops-1', 'recommend_step2_completed'],
    ['sess-ops-1', 'recommend_step3_completed'],
    [
      'sess-ops-1',
      'recommendation_generated',
      '{"recommendationRunId":1,"movieId":1,"candidateCount":3,"policyVersion":"v3-axis100","dataState":"synthetic","zeroResult":false}',
    ],
    // R21 품질 지표
    ['sess-ops-1', 'official_link_clicked', '{"chain":"cgv","context":"results"}'],
    ['sess-ops-1', 'recommendation_helpful', '{"recommendationRunId":1}'],
    ['sess-ops-2', 'recommendation_unhelpful', '{"recommendationRunId":2}'],
    [
      'sess-ops-2',
      'zero_results_shown',
      '{"movieId":1,"timeWindow":"evening","maxTravelMinutes":30,"priority":"quality"}',
    ],
    [
      'sess-ops-3',
      'zero_results_shown',
      '{"movieId":1,"timeWindow":"evening","maxTravelMinutes":30,"priority":"quality"}',
    ],
  ];
  for (const [sessionId, eventName, properties] of events) {
    await db.run(`INSERT INTO analytics_events (session_id, event_name, properties, created_at) VALUES (?,?,?,?)`, [
      sessionId,
      eventName,
      properties ?? null,
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

  it('사용 퍼널(R21 설문 단계 포함)을 이벤트 이름별 고유 세션 수로 집계한다', async () => {
    const summary = await alphaOpsRepository.getSummary();
    const byKey = Object.fromEntries(summary.funnel.map((f) => [f.key, f.sessionCount]));
    expect(byKey.app_opened).toBe(3);
    expect(byKey.movie_selected).toBe(2);
    expect(byKey.recommend_step1_started).toBe(1);
    expect(byKey.recommend_step1_completed).toBe(1);
    expect(byKey.recommend_step2_completed).toBe(1);
    expect(byKey.recommend_step3_completed).toBe(1);
    expect(byKey.recommendation_generated).toBe(1);
    expect(byKey.feedback_submitted).toBe(0);

    const movieSelected = summary.funnel.find((f) => f.key === 'movie_selected')!;
    expect(movieSelected.percentOfFirst).toBeCloseTo(66.7, 1);
  });

  it('R21 품질 지표 — 공식 링크 CTR·도움됨 비율·zero result 조건을 집계한다', async () => {
    const summary = await alphaOpsRepository.getSummary();
    expect(summary.quality.generatedSessions).toBe(1);
    expect(summary.quality.officialClickSessions).toBe(1);
    expect(summary.quality.officialLinkCtrPercent).toBe(100);
    expect(summary.quality.helpfulCount).toBe(1);
    expect(summary.quality.unhelpfulCount).toBe(1);
    expect(summary.quality.helpfulRatePercent).toBe(50);
    expect(summary.quality.zeroResultCount).toBe(2);
    expect(summary.quality.zeroResultConditions[0]).toMatchObject({
      movieId: 1,
      timeWindow: 'evening',
      maxTravelMinutes: 30,
      priority: 'quality',
      count: 2,
    });
  });
});
