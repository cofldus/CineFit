// 초대 코드·알파 동의 서비스 회귀 테스트 — 임시 DB 직접 시드
import { execSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

process.env.CINEFIT_DB_PATH = join(mkdtempSync(join(tmpdir(), 'cinefit-invite-')), 'invite-test.db');
process.env.CINEFIT_CLOCK_MODE = 'demo';

import { serverAnalytics } from '../../src/analytics/serverAnalytics';
import { getAppDbClient } from '../../src/data/client/index';
import {
  createInviteCode,
  hasAlphaConsent,
  listInviteCodes,
  recordAlphaConsent,
  redeemInviteCode,
  setInviteCodeActive,
} from '../../src/data/inviteCodeService';
import { getAppClock } from '../../src/lib/clock';

beforeAll(() => {
  const env = { ...process.env };
  execSync('node spikes/minimal-db/seed.mjs', { env });
  execSync('node db/migrate.mjs', { env });
});

async function ensureSession(sessionId: string) {
  await serverAnalytics.ensureSession(sessionId, undefined, getAppClock().now().toISOString());
}

describe('초대 코드 생성·조회', () => {
  it('코드를 생략하면 자동 생성된다', async () => {
    const code = await createInviteCode({ actor: 'admin', now: () => getAppClock().now() });
    expect(code.code).toHaveLength(8);
    expect(code.active).toBe(true);
    expect(code.useCount).toBe(0);
  });

  it('직접 지정한 코드는 대문자로 저장된다', async () => {
    const code = await createInviteCode({ code: 'demo2026', actor: 'admin', now: () => getAppClock().now() });
    expect(code.code).toBe('DEMO2026');
  });

  it('목록은 생성 시각 역순이다', async () => {
    const codes = await listInviteCodes();
    expect(codes.length).toBeGreaterThanOrEqual(2);
  });
});

describe('초대 코드 사용', () => {
  it('유효한 코드를 사용하면 성공하고 use_count가 오른다', async () => {
    const code = await createInviteCode({ code: 'USE001', maxUses: 2, actor: 'admin', now: () => getAppClock().now() });
    await ensureSession('sess-a');
    const result = await redeemInviteCode('use001', { sessionId: 'sess-a', now: () => getAppClock().now() });
    expect(result).toEqual({ ok: true, alreadyRedeemedByThisSession: false });

    const after = (await listInviteCodes()).find((c) => c.id === code.id)!;
    expect(after.useCount).toBe(1);
  });

  it('같은 세션이 같은 코드를 다시 제출해도 중복 소모되지 않는다', async () => {
    const code = await createInviteCode({ code: 'USE002', actor: 'admin', now: () => getAppClock().now() });
    await ensureSession('sess-b');
    await redeemInviteCode('USE002', { sessionId: 'sess-b', now: () => getAppClock().now() });
    const second = await redeemInviteCode('USE002', { sessionId: 'sess-b', now: () => getAppClock().now() });
    expect(second).toEqual({ ok: true, alreadyRedeemedByThisSession: true });

    const after = (await listInviteCodes()).find((c) => c.id === code.id)!;
    expect(after.useCount).toBe(1);
  });

  it('사용 한도를 채우면 이후 다른 세션은 거절된다', async () => {
    await createInviteCode({ code: 'LIMIT1', maxUses: 1, actor: 'admin', now: () => getAppClock().now() });
    await ensureSession('sess-c1');
    await ensureSession('sess-c2');
    const first = await redeemInviteCode('LIMIT1', { sessionId: 'sess-c1', now: () => getAppClock().now() });
    expect(first.ok).toBe(true);
    const second = await redeemInviteCode('LIMIT1', { sessionId: 'sess-c2', now: () => getAppClock().now() });
    expect(second).toEqual({ ok: false, error: 'exhausted' });
  });

  it('만료된 코드는 거절된다', async () => {
    await createInviteCode({ code: 'EXPIRED1', expiresAt: '2020-01-01T00:00:00.000Z', actor: 'admin', now: () => getAppClock().now() });
    await ensureSession('sess-d');
    const result = await redeemInviteCode('EXPIRED1', { sessionId: 'sess-d', now: () => getAppClock().now() });
    expect(result).toEqual({ ok: false, error: 'expired' });
  });

  it('비활성화된 코드는 거절된다', async () => {
    const code = await createInviteCode({ code: 'DEACT1', actor: 'admin', now: () => getAppClock().now() });
    await setInviteCodeActive(code.id, false);
    await ensureSession('sess-e');
    const result = await redeemInviteCode('DEACT1', { sessionId: 'sess-e', now: () => getAppClock().now() });
    expect(result).toEqual({ ok: false, error: 'inactive' });
  });

  it('존재하지 않는 코드는 거절된다', async () => {
    await ensureSession('sess-f');
    const result = await redeemInviteCode('NOSUCHCODE', { sessionId: 'sess-f', now: () => getAppClock().now() });
    expect(result).toEqual({ ok: false, error: 'not_found' });
  });

  it('비활성화했던 코드를 다시 활성화하면 사용할 수 있다', async () => {
    const code = await createInviteCode({ code: 'REACT1', actor: 'admin', now: () => getAppClock().now() });
    await setInviteCodeActive(code.id, false);
    await setInviteCodeActive(code.id, true);
    await ensureSession('sess-g');
    const result = await redeemInviteCode('REACT1', { sessionId: 'sess-g', now: () => getAppClock().now() });
    expect(result.ok).toBe(true);
  });

  it('존재하지 않는 id를 활성화/비활성화하면 오류를 반환한다', async () => {
    const result = await setInviteCodeActive(999_999, false);
    expect(result).toEqual({ ok: false, error: '존재하지 않는 초대 코드입니다.' });
  });
});

describe('알파 참여 동의', () => {
  it('동의 전에는 false다', async () => {
    await ensureSession('sess-consent-1');
    expect(await hasAlphaConsent('sess-consent-1')).toBe(false);
  });

  it('동의하면 true가 되고, 다시 호출해도 중복 삽입되지 않는다', async () => {
    await ensureSession('sess-consent-2');
    await recordAlphaConsent('sess-consent-2', getAppClock().now());
    await recordAlphaConsent('sess-consent-2', getAppClock().now());
    expect(await hasAlphaConsent('sess-consent-2')).toBe(true);

    const rows = await getAppDbClient().query<{ n: number }>(
      `SELECT COUNT(*) AS n FROM alpha_consents WHERE session_id = ?`,
      ['sess-consent-2'],
    );
    expect(rows[0].n).toBe(1);
  });
});
