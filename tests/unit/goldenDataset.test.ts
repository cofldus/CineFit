// 골든 데이터셋 회귀 게이트 — 정책이나 하드 필터 로직이 바뀌어 골든셋 기대와 어긋나면
// 이 테스트가 CI를 실패시킨다(섹션 31 "골든 평가의 기준 이하 결과는 CI를 실패시킬 수 있다").
// 임시 DB에 직접 시드한다 — 기본 시드 DB를 그대로 쓰면 recommendations.test.ts 등 같은
// 파일을 동시에 쓰는 다른 테스트 프로세스와 SQLite 파일 경합이 생겨 간헐적으로 실패했다
// (다른 관리자 API 테스트들과 동일한 이유로 동일한 격리 관례를 따른다).
import { execSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

process.env.CINEFIT_DB_PATH = join(mkdtempSync(join(tmpdir(), 'cinefit-golden-')), 'golden-test.db');

import { evaluateDataset, type GoldenScenario } from '../../scripts/eval-recommendations';
import { ACTIVE_POLICY } from '../../src/domain/recommendation/policies/activePolicy';

const dataset = JSON.parse(
  readFileSync(join(process.cwd(), 'eval', 'golden', 'v1.json'), 'utf8'),
) as { version: string; scenarios: GoldenScenario[] };

beforeAll(() => {
  const env = { ...process.env };
  execSync('node spikes/minimal-db/seed.mjs', { env });
  execSync('node db/migrate.mjs', { env });
  execSync('node db/seed-seat-zones.mjs', { env });
  execSync('node db/seed-aliases.mjs', { env });
});

describe('골든 데이터셋 v1 회귀', () => {
  it('시나리오가 50건 이상이다', () => {
    expect(dataset.scenarios.length).toBeGreaterThanOrEqual(50);
  });

  it('ACTIVE_POLICY로 전부 통과하고 하드 필터 위반이 없다', async () => {
    const report = await evaluateDataset(dataset, ACTIVE_POLICY);
    const failing = report.outcomes.filter((o) => !o.pass);
    expect(failing, JSON.stringify(failing, null, 2)).toHaveLength(0);
    expect(report.hardExclusionViolations).toBe(0);
    expect(report.passCount).toBe(report.scenarioCount);
  });
});
