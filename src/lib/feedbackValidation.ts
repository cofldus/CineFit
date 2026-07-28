import { z } from 'zod';

export const HELPFULNESS_LEVELS = [
  'very_helpful',
  'somewhat_helpful',
  'neutral',
  'not_very_helpful',
  'not_helpful',
] as const;

export const HELPFULNESS_LABELS: Record<(typeof HELPFULNESS_LEVELS)[number], string> = {
  very_helpful: '매우 도움 됨',
  somewhat_helpful: '어느 정도 도움 됨',
  neutral: '잘 모르겠음',
  not_very_helpful: '별로 도움 안 됨',
  not_helpful: '전혀 도움 안 됨',
};

export const FEEDBACK_REASONS = [
  'wanted_cinema_appeared',
  'reason_understood',
  'distance_price_comparison_useful',
  'seat_info_useful',
  'showtime_missing',
  'travel_time_inaccurate',
  'price_mismatch',
  'format_info_wrong',
  'unexpected_result',
  'explanation_too_complex',
  'too_few_candidates',
  'other',
] as const;

export const FEEDBACK_REASON_LABELS: Record<(typeof FEEDBACK_REASONS)[number], string> = {
  wanted_cinema_appeared: '원하는 상영관이 나옴',
  reason_understood: '추천 이유가 이해됨',
  distance_price_comparison_useful: '거리와 가격 비교가 유용함',
  seat_info_useful: '좌석 정보가 유용함',
  showtime_missing: '실제 상영 회차가 없음',
  travel_time_inaccurate: '이동 시간이 부정확함',
  price_mismatch: '가격이 다름',
  format_info_wrong: '포맷 정보가 틀림',
  unexpected_result: '추천 결과가 예상과 다름',
  explanation_too_complex: '설명이 복잡함',
  too_few_candidates: '후보가 너무 적음',
  other: '기타',
};

export const feedbackSchema = z.object({
  showtimeId: z.coerce.number().int().positive().optional(),
  helpfulness: z.enum(HELPFULNESS_LEVELS),
  reasons: z.array(z.enum(FEEDBACK_REASONS)).max(FEEDBACK_REASONS.length).optional(),
  freeText: z.string().trim().max(500).optional().or(z.literal('').transform(() => undefined)),
});
export type FeedbackInput = z.infer<typeof feedbackSchema>;

export const SELECTION_TYPES = [
  'picked_recommended',
  'picked_other_candidate',
  'picked_outside',
  'undecided',
  'cancelled',
] as const;

export const SELECTION_TYPE_LABELS: Record<(typeof SELECTION_TYPES)[number], string> = {
  picked_recommended: '이 상영관을 선택했어요',
  picked_other_candidate: '다른 후보를 선택했어요',
  picked_outside: '추천 외 상영관을 선택했어요',
  undecided: '아직 결정하지 않았어요',
  cancelled: '관람을 취소했어요',
};

export const SELECTION_REASONS = [
  'screen',
  'sound',
  'seat',
  'distance',
  'price',
  'time',
  'parking',
  'companion',
  'seat_availability',
  'booking_availability',
  'other',
] as const;

export const SELECTION_REASON_LABELS: Record<(typeof SELECTION_REASONS)[number], string> = {
  screen: '화면',
  sound: '사운드',
  seat: '좌석',
  distance: '거리',
  price: '가격',
  time: '시간',
  parking: '주차',
  companion: '동행자',
  seat_availability: '좋은 좌석 잔여',
  booking_availability: '예매 가능 여부',
  other: '기타',
};

export const selectionSchema = z.object({
  selectionType: z.enum(SELECTION_TYPES),
  auditoriumId: z.coerce.number().int().positive().optional(),
  reasons: z.array(z.enum(SELECTION_REASONS)).max(SELECTION_REASONS.length).optional(),
});
export type SelectionInput = z.infer<typeof selectionSchema>;

export function parseFeedback(raw: unknown): { ok: true; input: FeedbackInput } | { ok: false; errors: string[] } {
  const parsed = feedbackSchema.safeParse(raw);
  if (parsed.success) return { ok: true, input: parsed.data };
  return { ok: false, errors: parsed.error.issues.map((i) => `${i.path.join('.') || '입력'}: ${i.message}`) };
}

export function parseSelection(raw: unknown): { ok: true; input: SelectionInput } | { ok: false; errors: string[] } {
  const parsed = selectionSchema.safeParse(raw);
  if (parsed.success) return { ok: true, input: parsed.data };
  return { ok: false, errors: parsed.error.issues.map((i) => `${i.path.join('.') || '입력'}: ${i.message}`) };
}
