import { afterEach, describe, expect, it, vi } from 'vitest';
import { logger } from '../../src/lib/logger';

function captureConsole(method: 'log' | 'warn' | 'error') {
  const spy = vi.spyOn(console, method).mockImplementation(() => {});
  return spy;
}

describe('logger — 구조화 로깅', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('info는 console.log에 한 줄 JSON을 남긴다', () => {
    const spy = captureConsole('log');
    logger.info('test_event', { foo: 'bar' });
    expect(spy).toHaveBeenCalledTimes(1);
    const parsed = JSON.parse(spy.mock.calls[0][0] as string);
    expect(parsed).toMatchObject({ level: 'info', event: 'test_event', foo: 'bar' });
    expect(typeof parsed.time).toBe('string');
    expect(new Date(parsed.time).toISOString()).toBe(parsed.time);
  });

  it('warn은 console.warn을 쓴다', () => {
    const spy = captureConsole('warn');
    logger.warn('test_warn');
    const parsed = JSON.parse(spy.mock.calls[0][0] as string);
    expect(parsed.level).toBe('warn');
    expect(parsed.event).toBe('test_warn');
  });

  it('error는 Error 인스턴스에서 이름·메시지·스택을 뽑아내고 console.error를 쓴다', () => {
    const spy = captureConsole('error');
    logger.error('test_error', new Error('boom'), { context: 1 });
    const parsed = JSON.parse(spy.mock.calls[0][0] as string);
    expect(parsed.level).toBe('error');
    expect(parsed.errorName).toBe('Error');
    expect(parsed.errorMessage).toBe('boom');
    expect(typeof parsed.stack).toBe('string');
    expect(parsed.context).toBe(1);
  });

  it('error는 Error가 아닌 값도 안전하게 문자열화한다', () => {
    const spy = captureConsole('error');
    logger.error('test_error_non_error', 'plain string reason');
    const parsed = JSON.parse(spy.mock.calls[0][0] as string);
    expect(parsed.errorValue).toBe('plain string reason');
  });
});
