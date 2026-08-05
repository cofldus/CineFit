// 무의존성 CSV 파서·직렬화(R21 회차 import) — RFC 4180 수준: 큰따옴표 감싸기,
// 따옴표 이스케이프(""), 셀 내 쉼표·줄바꿈, CRLF/LF 모두 처리. BOM 제거.
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i += 1;
      row.push(cell);
      cell = '';
      rows.push(row);
      row = [];
    } else {
      cell += ch;
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  // 완전히 빈 행(trailing newline 등)은 제거
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

export function toCsv(rows: (string | number | null | undefined)[][]): string {
  const escape = (v: string | number | null | undefined) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return rows.map((r) => r.map(escape).join(',')).join('\r\n');
}

/** 헤더 행 → 소문자 trim 키 배열. 중복·빈 헤더는 그대로 두되 호출부에서 검증한다. */
export function normalizeHeader(cells: string[]): string[] {
  return cells.map((c) => c.trim().toLowerCase());
}
