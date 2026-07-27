import { z } from 'zod';
import { DEMO_DATE, ORIGIN_PRESETS } from '../data/constants';

// 폼(GET 쿼리, 문자열)과 API(JSON, 네이티브 타입) 입력을 모두 수용하는 스키마
const zBool = (defaultValue: boolean) =>
  z
    .union([z.boolean(), z.enum(['true', 'false']).transform((v) => v === 'true')])
    .default(defaultValue);

const originIds = ORIGIN_PRESETS.map((o) => o.id) as [string, ...string[]];

export const recommendationInputSchema = z.object({
  movieId: z.coerce.number().int().positive({ message: '영화를 선택해 주세요.' }),
  originId: z.enum(originIds).default('cityhall'),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, '날짜 형식은 YYYY-MM-DD 입니다.')
    .default(DEMO_DATE),
  maxTravelMinutes: z.coerce
    .number()
    .int()
    .min(5, '최대 이동 시간은 5분 이상이어야 합니다.')
    .max(240, '최대 이동 시간은 240분 이하여야 합니다.')
    .default(60),
  maxPrice: z.coerce
    .number()
    .int()
    .min(1_000, '가격 상한은 1,000원 이상이어야 합니다.')
    .max(200_000, '가격 상한은 200,000원 이하여야 합니다.')
    .default(40_000),
  priority: z.enum(['balance', 'quality', 'logistics']).default('balance'),
  allowImax: zBool(true),
  allowDolby: zBool(true),
  allowStandard: zBool(true),
  motionSickness: z.coerce.number().int().min(0).max(2).default(0),
  subtitleReadability: zBool(false),
  neckComfort: zBool(false),
  wheelchair: zBool(false),
});

export type RecommendationInput = z.infer<typeof recommendationInputSchema>;

export function parseRecommendationInput(raw: unknown):
  | { ok: true; input: RecommendationInput }
  | { ok: false; errors: string[] } {
  const parsed = recommendationInputSchema.safeParse(raw);
  if (parsed.success) return { ok: true, input: parsed.data };
  return {
    ok: false,
    errors: parsed.error.issues.map((i) => `${i.path.join('.') || '입력'}: ${i.message}`),
  };
}
