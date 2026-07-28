// 추천 실패 원인 분류(섹션 15) — 사용자 피드백 이유 코드(src/lib/feedbackValidation.ts)를
// 내부 분석용 taxonomy로 매핑한다. 하나의 피드백이 여러 원인에 동시에 해당할 수 있다.
import type { FEEDBACK_REASONS } from '../../lib/feedbackValidation';

export const FAILURE_CATEGORIES = [
  'DATA_MISSING',
  'DATA_STALE',
  'DATA_INCORRECT',
  'FORMAT_MISMATCH',
  'SEAT_DATA_MISSING',
  'TRAVEL_TIME_ERROR',
  'PRICE_ERROR',
  'SHOWTIME_MISSING',
  'HARD_FILTER_ERROR',
  'WEIGHTING_ERROR',
  'EXPLANATION_ERROR',
  'UI_MISUNDERSTANDING',
  'USER_PREFERENCE_MISSING',
] as const;

export type FailureCategory = (typeof FAILURE_CATEGORIES)[number];

export const FAILURE_CATEGORY_LABELS: Record<FailureCategory, string> = {
  DATA_MISSING: '데이터 없음',
  DATA_STALE: '오래된 데이터',
  DATA_INCORRECT: '데이터 오류',
  FORMAT_MISMATCH: '포맷 정보 불일치',
  SEAT_DATA_MISSING: '좌석 정보 없음',
  TRAVEL_TIME_ERROR: '이동 시간 오차',
  PRICE_ERROR: '가격 오차',
  SHOWTIME_MISSING: '회차 정보 없음',
  HARD_FILTER_ERROR: '하드 필터 오류',
  WEIGHTING_ERROR: '가중치 문제',
  EXPLANATION_ERROR: '설명 오류',
  UI_MISUNDERSTANDING: 'UI 오해',
  USER_PREFERENCE_MISSING: '사용자 선호 미반영',
};

/** 사용자 피드백 이유 → 내부 실패 분류(복수 가능). 도움이 됐다는 긍정 신호는 빈 배열을 반환한다. */
export function classifyFeedbackReason(reason: (typeof FEEDBACK_REASONS)[number]): FailureCategory[] {
  switch (reason) {
    case 'showtime_missing':
      return ['SHOWTIME_MISSING', 'DATA_MISSING'];
    case 'travel_time_inaccurate':
      return ['TRAVEL_TIME_ERROR'];
    case 'price_mismatch':
      return ['PRICE_ERROR', 'DATA_STALE'];
    case 'format_info_wrong':
      return ['FORMAT_MISMATCH', 'DATA_INCORRECT'];
    case 'unexpected_result':
      return ['WEIGHTING_ERROR'];
    case 'explanation_too_complex':
      return ['EXPLANATION_ERROR', 'UI_MISUNDERSTANDING'];
    case 'too_few_candidates':
      return ['HARD_FILTER_ERROR', 'DATA_MISSING'];
    // 긍정 신호 — 실패 분류 대상 아님
    case 'wanted_cinema_appeared':
    case 'reason_understood':
    case 'distance_price_comparison_useful':
    case 'seat_info_useful':
    case 'other':
      return [];
    default:
      return [];
  }
}

/** 여러 이유 코드에서 나온 분류를 중복 없이 합친다. */
export function classifyFeedbackReasons(reasons: (typeof FEEDBACK_REASONS)[number][]): FailureCategory[] {
  return [...new Set(reasons.flatMap(classifyFeedbackReason))];
}
