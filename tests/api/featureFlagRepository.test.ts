// featureFlagRepository 회귀 테스트 — 임시 DB, 감사 로그가 함께 남는지도 확인한다
import { execSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

process.env.CINEFIT_DB_PATH = join(mkdtempSync(join(tmpdir(), 'cinefit-flags-')), 'flags-test.db');
process.env.CINEFIT_CLOCK_MODE = 'demo';

import { getAppDbClient } from '../../src/data/client/index';
import { featureFlagRepository } from '../../src/data/featureFlagRepository';
import { getAppClock } from '../../src/lib/clock';

beforeAll(() => {
  const env = { ...process.env };
  execSync('node spikes/minimal-db/seed.mjs', { env });
  execSync('node db/migrate.mjs', { env });
});

describe('기능 플래그 조회', () => {
  it('존재하지 않는 플래그는 기본적으로 꺼져 있다', async () => {
    expect(await featureFlagRepository.isEnabled('nonexistent')).toBe(false);
    expect(await featureFlagRepository.get('nonexistent')).toBeNull();
  });

  it('목록은 처음엔 비어 있다', async () => {
    expect(await featureFlagRepository.list()).toEqual([]);
  });
});

describe('기능 플래그 변경', () => {
  it('새 플래그를 만들면 감사 로그가 함께 남는다', async () => {
    const now = getAppClock().now();
    const flag = await featureFlagRepository.set({
      key: 'onboarding',
      enabled: true,
      description: '테스트',
      actor: 'admin',
      now,
    });
    expect(flag.enabled).toBe(true);
    expect(flag.updatedBy).toBe('admin');
    expect(await featureFlagRepository.isEnabled('onboarding')).toBe(true);

    const logs = await getAppDbClient().query<{ action: string; detail: string }>(
      `SELECT action, detail FROM audit_logs WHERE target_type = 'feature_flag' ORDER BY id DESC LIMIT 1`,
    );
    expect(logs[0].action).toBe('feature_flag_set');
    const detail = JSON.parse(logs[0].detail) as { key: string; previousEnabled: boolean | null; newEnabled: boolean };
    expect(detail).toEqual({ key: 'onboarding', previousEnabled: null, newEnabled: true, description: '테스트' });
  });

  it('같은 키를 다시 set하면 값이 갱신되고 이전 값이 감사 로그에 남는다', async () => {
    const now = getAppClock().now();
    await featureFlagRepository.set({ key: 'onboarding', enabled: false, actor: 'admin2', now });
    expect(await featureFlagRepository.isEnabled('onboarding')).toBe(false);

    const logs = await getAppDbClient().query<{ detail: string }>(
      `SELECT detail FROM audit_logs WHERE target_type = 'feature_flag' ORDER BY id DESC LIMIT 1`,
    );
    const detail = JSON.parse(logs[0].detail) as { previousEnabled: boolean | null; newEnabled: boolean };
    expect(detail.previousEnabled).toBe(true);
    expect(detail.newEnabled).toBe(false);
  });
});
