// Vercel Cron 라우트 회귀 테스트 — CRON_SECRET 인증과 각 작업 실행을 확인한다.
// maintenance-links는 spike 시드가 전부 합성(is_synthetic=1) 회차라 체크 대상이 0건 —
// 실제 네트워크 요청 없이 안전하게 테스트할 수 있다.
import { execSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

process.env.CRON_SECRET = 'test-cron-secret';
process.env.CINEFIT_DB_PATH = join(mkdtempSync(join(tmpdir(), 'cinefit-cron-')), 'cron-test.db');
process.env.CINEFIT_CLOCK_MODE = 'demo';

import { GET as maintenanceDailyGet } from '../../app/api/admin/cron/maintenance-daily/route';
import { GET as maintenanceLinksGet } from '../../app/api/admin/cron/maintenance-links/route';
import { GET as retentionApplyGet } from '../../app/api/admin/cron/retention-apply/route';

beforeAll(() => {
  const env = { ...process.env };
  execSync('node spikes/minimal-db/seed.mjs', { env });
  execSync('node db/migrate.mjs', { env });
});

const authed = () => new Request('http://localhost/api/admin/cron/x', { headers: { authorization: 'Bearer test-cron-secret' } });
const unauthed = () => new Request('http://localhost/api/admin/cron/x');
const wrongToken = () => new Request('http://localhost/api/admin/cron/x', { headers: { authorization: 'Bearer nope' } });

describe.each([
  ['maintenance-daily', maintenanceDailyGet],
  ['maintenance-links', maintenanceLinksGet],
  ['retention-apply', retentionApplyGet],
])('%s', (_name, handler) => {
  it('인증 헤더가 없으면 401', async () => {
    const res = await handler(unauthed());
    expect(res.status).toBe(401);
  });

  it('잘못된 토큰이면 401', async () => {
    const res = await handler(wrongToken());
    expect(res.status).toBe(401);
  });

  it('올바른 CRON_SECRET이면 실행되고 ok:true를 반환한다', async () => {
    const res = await handler(authed());
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean };
    expect(body.ok).toBe(true);
  });
});

describe('CRON_SECRET 미설정', () => {
  it('환경변수가 없으면 올바른 토큰이 없으니 항상 401', async () => {
    const prev = process.env.CRON_SECRET;
    delete process.env.CRON_SECRET;
    try {
      const res = await maintenanceDailyGet(new Request('http://localhost/x', { headers: { authorization: 'Bearer anything' } }));
      expect(res.status).toBe(401);
    } finally {
      process.env.CRON_SECRET = prev;
    }
  });
});
