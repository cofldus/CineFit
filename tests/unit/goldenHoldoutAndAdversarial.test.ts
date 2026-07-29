// 홀드아웃·적대적 평가 회귀 게이트 — goldenDataset.test.ts와 같은 격리 방식(임시 DB 직접 시드).
import { execSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

process.env.CINEFIT_DB_PATH = join(mkdtempSync(join(tmpdir(), 'cinefit-holdout-')), 'holdout-test.db');

import { evaluateAdversarial, type AdversarialCase } from '../../scripts/eval-adversarial';
import { evaluateDataset, type GoldenScenario } from '../../scripts/eval-recommendations';
import { ACTIVE_POLICY } from '../../src/domain/recommendation/policies/activePolicy';

const holdout = JSON.parse(
  readFileSync(join(process.cwd(), 'eval', 'golden', 'holdout-v1.json'), 'utf8'),
) as { version: string; scenarios: GoldenScenario[] };

const adversarial = JSON.parse(
  readFileSync(join(process.cwd(), 'eval', 'adversarial', 'v1.json'), 'utf8'),
) as { version: string; cases: AdversarialCase[] };

beforeAll(() => {
  const env = { ...process.env };
  execSync('node spikes/minimal-db/seed.mjs', { env });
  execSync('node db/migrate.mjs', { env });
  execSync('node db/seed-seat-zones.mjs', { env });
  execSync('node db/seed-aliases.mjs', { env });
});

describe('홀드아웃 데이터셋(v1과 분리된 독립 평가 세트)', () => {
  it('시나리오가 30건 이상이다', () => {
    expect(holdout.scenarios.length).toBeGreaterThanOrEqual(30);
  });

  it('development 세트(v1)와 시나리오 id가 겹치지 않는다', () => {
    const devIds = new Set(
      (JSON.parse(readFileSync(join(process.cwd(), 'eval', 'golden', 'v1.json'), 'utf8')) as { scenarios: { id: string }[] })
        .scenarios.map((s) => s.id),
    );
    const overlap = holdout.scenarios.filter((s) => devIds.has(s.id));
    expect(overlap).toHaveLength(0);
  });

  it('ACTIVE_POLICY로 전부 통과하고 하드 필터 위반이 없다', async () => {
    const report = await evaluateDataset(holdout, ACTIVE_POLICY);
    const failing = report.outcomes.filter((o) => !o.pass);
    expect(failing, JSON.stringify(failing, null, 2)).toHaveLength(0);
    expect(report.hardExclusionViolations).toBe(0);
  });
});

describe('적대적(변형) 평가 — 불변식이 실제로 지켜지는지', () => {
  it('케이스가 10건 이상이다', () => {
    expect(adversarial.cases.length).toBeGreaterThanOrEqual(10);
  });

  it('ACTIVE_POLICY로 모든 불변식을 만족한다', async () => {
    const report = await evaluateAdversarial(adversarial, ACTIVE_POLICY);
    const failing = report.outcomes.filter((o) => !o.pass);
    expect(failing, JSON.stringify(failing, null, 2)).toHaveLength(0);
  });
});
