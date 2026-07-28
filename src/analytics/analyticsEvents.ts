// 분석 이벤트 스키마 — 이벤트를 여기 목록·스키마에 없는 이름·속성으로는 저장할 수 없다.
// 정확한 위치(GPS)·전체 IP·광고 식별자·자유 입력 전문은 어떤 이벤트에도 포함하지 않는다
// (docs/PRIVACY-BETA.md). 새 이벤트를 추가할 때는 반드시 여기부터 수정한다.
import { z } from 'zod';

const runId = z.number().int().positive();
const movieId = z.number().int().positive();
const auditoriumId = z.number().int().positive();
const showtimeId = z.number().int().positive();

export const ANALYTICS_EVENT_SCHEMAS = {
  app_opened: z.object({}),
  movie_viewed: z.object({ movieId }),
  movie_selected: z.object({ movieId }),
  recommendation_started: z.object({ movieId }),
  recommendation_completed: z.object({
    recommendationRunId: runId,
    movieId,
    candidateCount: z.number().int().nonnegative(),
    resultTypes: z.array(z.enum(['균형', '품질', '근접·가성비'])),
    processingTimeMs: z.number().int().nonnegative(),
    dataConfidenceBucket: z.enum(['높음', '보통', '낮음']),
    syntheticDataUsed: z.boolean(),
  }),
  recommendation_empty: z.object({ movieId, excludedCount: z.number().int().nonnegative() }),
  recommendation_card_viewed: z.object({ recommendationRunId: runId, label: z.enum(['균형', '품질', '근접·가성비']) }),
  recommendation_detail_opened: z.object({ recommendationRunId: runId, label: z.enum(['균형', '품질', '근접·가성비']) }),
  cinema_viewed: z.object({ auditoriumId }),
  booking_link_clicked: z.object({ recommendationRunId: runId.optional(), showtimeId }),
  conditions_changed: z.object({ field: z.string().max(60) }),
  condition_relaxed: z.object({ field: z.string().max(60) }),
  feedback_submitted: z.object({ recommendationRunId: runId }),
  issue_report_started: z.object({ auditoriumId: auditoriumId.optional() }),
  issue_report_submitted: z.object({ reportId: z.number().int().positive() }),
  alpha_survey_completed: z.object({}),
} as const;

export type AnalyticsEventName = keyof typeof ANALYTICS_EVENT_SCHEMAS;
export const ANALYTICS_EVENT_NAMES = Object.keys(ANALYTICS_EVENT_SCHEMAS) as AnalyticsEventName[];

export type AnalyticsEventProperties<E extends AnalyticsEventName> = z.infer<(typeof ANALYTICS_EVENT_SCHEMAS)[E]>;

export function parseAnalyticsEvent(
  eventName: unknown,
  properties: unknown,
): { ok: true; eventName: AnalyticsEventName; properties: Record<string, unknown> } | { ok: false; error: string } {
  if (typeof eventName !== 'string' || !(eventName in ANALYTICS_EVENT_SCHEMAS)) {
    return { ok: false, error: '알 수 없는 이벤트입니다.' };
  }
  const schema = ANALYTICS_EVENT_SCHEMAS[eventName as AnalyticsEventName];
  const parsed = schema.safeParse(properties ?? {});
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => `${i.path.join('.') || '속성'}: ${i.message}`).join(' / ') };
  }
  return { ok: true, eventName: eventName as AnalyticsEventName, properties: parsed.data as Record<string, unknown> };
}
