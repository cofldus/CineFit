import { describe, expect, it } from 'vitest';
import { normalizeHeader, parseCsv, toCsv } from '../../src/lib/csv';

describe('parseCsv', () => {
  it('기본 콤마 분리·CRLF·빈 행 제거', () => {
    expect(parseCsv('a,b,c\r\n1,2,3\r\n\r\n')).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ]);
  });

  it('따옴표 셀 안의 콤마·줄바꿈·이스케이프("")를 처리한다', () => {
    expect(parseCsv('name,note\n"듄, 파트 2","말했다 ""좋다""고\n두 줄"')).toEqual([
      ['name', 'note'],
      ['듄, 파트 2', '말했다 "좋다"고\n두 줄'],
    ]);
  });

  it('BOM을 제거한다', () => {
    expect(parseCsv('﻿a,b\n1,2')[0]).toEqual(['a', 'b']);
  });
});

describe('toCsv', () => {
  it('콤마·따옴표·줄바꿈이 있는 값을 안전하게 감싼다', () => {
    expect(toCsv([['a,b', '"q"', 'line\nbreak'], [1, null, undefined]])).toBe(
      '"a,b","""q""","line\nbreak"\r\n1,,',
    );
  });
});

describe('normalizeHeader', () => {
  it('소문자·trim 정규화', () => {
    expect(normalizeHeader([' ShowDate ', 'startsAt'])).toEqual(['showdate', 'startsat']);
  });
});
