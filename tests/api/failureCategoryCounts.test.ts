// feedbackService.countFailureCategories 회귀 테스트 — 임시 DB에 직접 시드
import { execSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

process.env.CINEFIT_DB_PATH = join(mkdtempSync(join(tmpdir(), 'cinefit-failurecat-')), 'failurecat-test.db');
process.env.CINEFIT_CLOCK_MODE = 'demo';

import { serverAnalytics } from '../../src/analytics/serverAnalytics';
import { getAppDbClient } from '../../src/data/client/index';
import { feedbackService } from '../../src/data/feedbackService';
import { getAppClock } from '../../src/lib/clock';

let runId: number;

beforeAll(async () => {
  const env = { ...process.env };
  execSync('node spikes/minimal-db/seed.mjs', { env });
  execSync('node db/migrate.mjs', { env });
  execSync('node db/seed-seat-zones.mjs', { env });
  execSync('node db/seed-aliases.mjs', { env });

  const db = getAppDbClient();
  const rows = await db.query<{ id: number }>(
    `INSERT INTO recommendation_runs (user_id, request, weights, results, latency_ms, policy_version, code_version, created_at)
     VALUES ('demo-user','{}','{}','[]',5,'v1','0.2.0',?) RETURNING id`,
    [new Date().toISOString()],
  );
  runId = rows[0].id;
});

describe('실패 원인 집계', () => {
  it('피드백이 없으면 전부 0이다', async () => {
    const counts = await feedbackService.countFailureCategories();
    expect(counts.SHOWTIME_MISSING).toBe(0);
    expect(counts.PRICE_ERROR).toBe(0);
  });

  it('피드백 이유가 실패 분류로 집계된다(복수 원인 허용)', async () => {
    const now = getAppClock().now();
    for (const sessionId of ['sess-a', 'sess-b', 'sess-c']) {
      await serverAnalytics.ensureSession(sessionId, undefined, now.toISOString());
    }
    await feedbackService.submitFeedback(
      runId,
      { helpfulness: 'not_helpful', reasons: ['showtime_missing', 'price_mismatch'] },
      { sessionId: 'sess-a', now },
    );
    await feedbackService.submitFeedback(
      runId,
      { helpfulness: 'not_very_helpful', reasons: ['showtime_missing'] },
      { sessionId: 'sess-b', now },
    );
    // 긍정 신호만 있는 피드백은 실패 분류에 기여하지 않는다
    await feedbackService.submitFeedback(
      runId,
      { helpfulness: 'very_helpful', reasons: ['reason_understood'] },
      { sessionId: 'sess-c', now },
    );

    const counts = await feedbackService.countFailureCategories();
    expect(counts.SHOWTIME_MISSING).toBe(2);
    expect(counts.DATA_MISSING).toBe(2); // showtime_missing이 SHOWTIME_MISSING+DATA_MISSING 둘 다에 기여
    expect(counts.PRICE_ERROR).toBe(1);
    expect(counts.EXPLANATION_ERROR).toBe(0);
  });
});
