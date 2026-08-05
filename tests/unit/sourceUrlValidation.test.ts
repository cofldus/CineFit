// R21.1 §2 — source URL 검증: placeholder·loopback·비공식 도메인 거부.
import { describe, expect, it } from 'vitest';
import { validateSourceUrl } from '../../src/lib/sourceUrlValidation';

describe('validateSourceUrl', () => {
  it('빈 값·비URL·http(s) 외 프로토콜을 거부한다', () => {
    expect(validateSourceUrl('').ok).toBe(false);
    expect(validateSourceUrl(null).ok).toBe(false);
    expect(validateSourceUrl('not-a-url').ok).toBe(false);
    expect(validateSourceUrl('ftp://cgv.co.kr/x').ok).toBe(false);
    expect(validateSourceUrl('javascript:alert(1)').ok).toBe(false);
  });

  it('localhost·loopback·사설 호스트를 거부한다', () => {
    for (const u of [
      'http://localhost:3000/x',
      'http://127.0.0.1/x',
      'https://[::1]/x',
      'http://192.168.0.10/x',
      'http://10.0.0.5/x',
    ]) {
      expect(validateSourceUrl(u).ok).toBe(false);
    }
  });

  it('example.invalid 등 placeholder는 "교체" 안내가 담긴 명확한 오류다', () => {
    const r = validateSourceUrl('https://example.invalid/REPLACE-확인한-공식페이지');
    expect(r.ok).toBe(false);
    expect((r as { error: string }).error).toContain('placeholder');
    expect(validateSourceUrl('https://example.com/booking').ok).toBe(false);
    expect(validateSourceUrl('https://cgv.example/confirm').ok).toBe(false);
  });

  it('공식 도메인 요구 시 CGV·롯데시네마·메가박스(서브도메인 포함)만 허용한다', () => {
    const opts = { requireOfficial: true };
    expect(validateSourceUrl('http://www.cgv.co.kr/theaters/', opts).ok).toBe(true);
    expect(validateSourceUrl('https://ticket.cgv.co.kr/show/1', opts).ok).toBe(true);
    expect(validateSourceUrl('https://www.lottecinema.co.kr/x', opts).ok).toBe(true);
    expect(validateSourceUrl('https://www.megabox.co.kr/x', opts).ok).toBe(true);
    expect(validateSourceUrl('https://cgv.co.kr.evil.com/x', opts).ok).toBe(false);
    expect(validateSourceUrl('https://naver.com/x', opts).ok).toBe(false);
  });

  it('공식 요구가 없으면 일반 https 도메인은 허용된다(레거시 게이트용 기본 검증)', () => {
    expect(validateSourceUrl('https://blog.example.co.kr/review'.replace('example', 'sample')).ok).toBe(true);
  });
});
