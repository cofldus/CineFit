// private_alpha_gate가 켜졌을 때만 분석 이벤트 기록에 동의가 필요해지는지 확인한다.
// 꺼져 있으면(기본값) 7차 마일스톤과 동일하게 항상 기록돼야 한다.
import { execSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

process.env.CINEFIT_DB_PATH = join(mkdtempSync(join(tmpdir(), 'cinefit-consentgate-')), 'consentgate-test.db');
process.env.CINEFIT_CLOCK_MODE = 'demo';

import { serverAnalytics } from '../../src/analytics/serverAnalytics';
import { getAppDbClient } from '../../src/data/client/index';
import { featureFlagRepository } from '../../src/data/featureFlagRepository';
import { recordAlphaConsent } from '../../src/data/inviteCodeService';
import { getAppClock } from '../../src/lib/clock';

beforeAll(() => {
  const env = { ...process.env };
  execSync('node spikes/minimal-db/seed.mjs', { env });
  execSync('node db/migrate.mjs', { env });
});

async function eventCountFor(sessionId: string): Promise<number> {
  const rows = await getAppDbClient().query<{ n: number }>(
    `SELECT COUNT(*) AS n FROM analytics_events WHERE session_id = ?`,
    [sessionId],
  );
  return rows[0].n;
}

describe('게이트가 꺼져 있으면(기본값)', () => {
  it('동의 없이도 항상 기록된다', async () => {
    const now = getAppClock().now();
    await serverAnalytics.recordEvent('app_opened', {}, { sessionId: 'sess-gate-off', now });
    expect(await eventCountFor('sess-gate-off')).toBe(1);
  });
});

describe('게이트가 켜져 있으면', () => {
  it('동의하지 않은 세션의 이벤트는 기록되지 않는다', async () => {
    await featureFlagRepository.set({ key: 'private_alpha_gate', enabled: true, actor: 'test', now: getAppClock().now() });
    try {
      const now = getAppClock().now();
      await serverAnalytics.recordEvent('app_opened', {}, { sessionId: 'sess-gate-on-no-consent', now });
      expect(await eventCountFor('sess-gate-on-no-consent')).toBe(0);
    } finally {
      await featureFlagRepository.set({ key: 'private_alpha_gate', enabled: false, actor: 'test', now: getAppClock().now() });
    }
  });

  it('동의한 세션의 이벤트는 기록된다', async () => {
    await featureFlagRepository.set({ key: 'private_alpha_gate', enabled: true, actor: 'test', now: getAppClock().now() });
    try {
      const now = getAppClock().now();
      await serverAnalytics.ensureSession('sess-gate-on-consented', undefined, now.toISOString());
      await recordAlphaConsent('sess-gate-on-consented', now);
      await serverAnalytics.recordEvent('app_opened', {}, { sessionId: 'sess-gate-on-consented', now });
      expect(await eventCountFor('sess-gate-on-consented')).toBe(1);
    } finally {
      await featureFlagRepository.set({ key: 'private_alpha_gate', enabled: false, actor: 'test', now: getAppClock().now() });
    }
  });
});
