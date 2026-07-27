import type { Priority, Weights } from './types';

// topPriority 가중치 프리셋 (문서 05 §5)
export const WEIGHT_PRESETS: Record<Priority, Weights> = {
  balance: { W1: 0.18, W2: 0.15, W3: 0.12, W4: 0.12, W5: 0.1, W6: 0.05, W7: 0.18, W8: 0.1 },
  quality: { W1: 0.25, W2: 0.22, W3: 0.15, W4: 0.1, W5: 0.08, W6: 0.05, W7: 0.1, W8: 0.05 },
  logistics: { W1: 0.1, W2: 0.08, W3: 0.08, W4: 0.08, W5: 0.08, W6: 0.05, W7: 0.3, W8: 0.23 },
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  balance: '균형',
  quality: '영상·음향 품질',
  logistics: '이동·편의',
};

export const FORMAT_LABELS: Record<string, string> = {
  imax: 'IMAX',
  dolby_cinema: '돌비시네마',
  '4dx': '4DX',
  superplex: '수퍼플렉스',
  standard: '일반',
};

// 사용자에게는 쉬운 말로 노출 — 원래 상태 값(official 등)은 내부 로직에서만 사용 (docs/09 §1.3)
export const INFO_STATUS_LABELS: Record<string, string> = {
  official: '공식 확인',
  multi_source: '여러 출처 확인',
  user_report: '사용자 제보',
  single_unverified: '출처 1곳(미확인)',
  estimated: '추정치',
  rumor: '확인 안 됨',
  outdated: '오래된 정보',
  conflict: '정보 엇갈림',
};

// 검증된 사양으로 인정하는 등급 (문서 05 §4.1)
export const VERIFIED_STATUSES = new Set(['official', 'multi_source']);
