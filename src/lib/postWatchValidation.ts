import { z } from 'zod';

const scale = z.coerce.number().int().min(1).max(5);

export const postWatchSurveySchema = z.object({
  overallSatisfaction: scale,
  infoAccuracy: scale.optional(),
  seatSatisfaction: scale.optional(),
  screenSatisfaction: scale.optional(),
  soundSatisfaction: scale.optional(),
  travelTimeAccuracy: scale.optional(),
  priceAccuracy: scale.optional(),
  wouldChooseAgain: scale.optional(),
  wouldReuseCinefit: scale.optional(),
});
export type PostWatchSurveyInput = z.infer<typeof postWatchSurveySchema>;

export function parsePostWatchSurvey(
  raw: unknown,
): { ok: true; input: PostWatchSurveyInput } | { ok: false; errors: string[] } {
  const parsed = postWatchSurveySchema.safeParse(raw);
  if (parsed.success) return { ok: true, input: parsed.data };
  return { ok: false, errors: parsed.error.issues.map((i) => `${i.path.join('.') || '입력'}: ${i.message}`) };
}
