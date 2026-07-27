import { afterEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_DEMO_NOW_ISO,
  fixedClock,
  getAppClock,
  seoulDateString,
  systemClock,
} from '../../src/lib/clock';

const cleanup: (() => void)[] = [];
afterEach(() => {
  cleanup.splice(0).forEach((f) => f());
});

function setEnv(key: string, value: string | undefined) {
  const prev = process.env[key];
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
  cleanup.push(() => {
    if (prev === undefined) delete process.env[key];
    else process.env[key] = prev;
  });
}

describe('Clock — 운영·데모·테스트 시각 분리', () => {
  it('fixedClock은 항상 같은 시각을 반환한다', () => {
    const c = fixedClock('2026-07-27T12:00:00+09:00');
    expect(c.now().toISOString()).toBe('2026-07-27T03:00:00.000Z');
    expect(fixedClock(DEFAULT_DEMO_NOW_ISO).now().getTime()).toBe(c.now().getTime());
  });

  it('잘못된 고정 시각은 즉시 실패한다', () => {
    expect(() => fixedClock('not-a-date')).toThrow();
  });

  it('기본 모드는 system, demo 모드는 CINEFIT_DEMO_NOW를 사용한다', () => {
    setEnv('CINEFIT_CLOCK_MODE', undefined);
    const sys = getAppClock().now().getTime();
    expect(Math.abs(sys - systemClock().now().getTime())).toBeLessThan(5_000);

    setEnv('CINEFIT_CLOCK_MODE', 'demo');
    setEnv('CINEFIT_DEMO_NOW', '2026-08-15T09:00:00+09:00');
    expect(getAppClock().now().toISOString()).toBe('2026-08-15T00:00:00.000Z');

    setEnv('CINEFIT_DEMO_NOW', undefined);
    expect(getAppClock().now().getTime()).toBe(new Date(DEFAULT_DEMO_NOW_ISO).getTime());
  });
});

describe('Asia/Seoul 날짜 경계', () => {
  it('UTC 15:00 이후는 서울 기준 다음 날이다', () => {
    expect(seoulDateString(new Date('2026-07-27T14:59:00Z'))).toBe('2026-07-27'); // 23:59 KST
    expect(seoulDateString(new Date('2026-07-27T15:00:00Z'))).toBe('2026-07-28'); // 00:00 KST
    expect(seoulDateString(new Date('2026-07-27T16:30:00Z'))).toBe('2026-07-28'); // 01:30 KST 심야
  });

  it('심야 회차의 시작 시각도 서울 날짜로 귀속된다', () => {
    // 2026-07-29 00:30 KST 시작 회차 = UTC 2026-07-28T15:30Z
    const midnightShow = new Date('2026-07-29T00:30:00+09:00');
    expect(seoulDateString(midnightShow)).toBe('2026-07-29');
    expect(midnightShow.toISOString()).toBe('2026-07-28T15:30:00.000Z');
  });
});
