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

export const INFO_STATUS_LABELS: Record<string, string> = {
  official: '공식 확인',
  multi_source: '복수 출처',
  user_report: '사용자 제보',
  single_unverified: '단일 출처 미확인',
  estimated: '추정',
  rumor: '소문',
  outdated: '오래된 정보',
  conflict: '출처 충돌',
};

// 검증된 사양으로 인정하는 등급 (문서 05 §4.1)
export const VERIFIED_STATUSES = new Set(['official', 'multi_source']);
