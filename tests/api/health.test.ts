// 헬스 체크 API 회귀 테스트 — 임시 DB에 직접 시드
import { execSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

process.env.CINEFIT_DB_PATH = join(mkdtempSync(join(tmpdir(), 'cinefit-health-')), 'health-test.db');

import { GET as healthGet } from '../../app/api/health/route';

beforeAll(() => {
  const env = { ...process.env };
  execSync('node spikes/minimal-db/seed.mjs', { env });
  execSync('node db/migrate.mjs', { env });
});

describe('GET /api/health', () => {
  it('DB 연결이 되면 200과 status:ok를 반환한다', async () => {
    const res = await healthGet();
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string; dbProvider: string; time: string };
    expect(body.status).toBe('ok');
    expect(body.dbProvider).toBe('sqlite');
    expect(new Date(body.time).toISOString()).toBe(body.time);
  });
});
