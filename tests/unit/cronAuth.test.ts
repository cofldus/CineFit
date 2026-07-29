import { afterEach, describe, expect, it } from 'vitest';
import { isCronRequest } from '../../src/lib/cronAuth';

const originalSecret = process.env.CRON_SECRET;

describe('isCronRequest', () => {
  afterEach(() => {
    if (originalSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = originalSecret;
  });

  it('CRON_SECRET이 미설정이면 항상 거부한다', () => {
    delete process.env.CRON_SECRET;
    const req = new Request('http://localhost/x', { headers: { authorization: 'Bearer whatever' } });
    expect(isCronRequest(req)).toBe(false);
  });

  it('Authorization 헤더가 없으면 거부한다', () => {
    process.env.CRON_SECRET = 'sekret';
    expect(isCronRequest(new Request('http://localhost/x'))).toBe(false);
  });

  it('값이 일치하지 않으면 거부한다', () => {
    process.env.CRON_SECRET = 'sekret';
    const req = new Request('http://localhost/x', { headers: { authorization: 'Bearer wrong' } });
    expect(isCronRequest(req)).toBe(false);
  });

  it('Bearer <CRON_SECRET>이 정확히 일치하면 허용한다', () => {
    process.env.CRON_SECRET = 'sekret';
    const req = new Request('http://localhost/x', { headers: { authorization: 'Bearer sekret' } });
    expect(isCronRequest(req)).toBe(true);
  });
});
