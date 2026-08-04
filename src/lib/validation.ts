import { z } from 'zod';
import { DEMO_DATE, ORIGIN_PRESETS } from '../data/constants';

// 폼(GET 쿼리, 문자열)과 API(JSON, 네이티브 타입) 입력을 모두 수용하는 스키마
const zBool = (defaultValue: boolean) =>
  z
    .union([z.boolean(), z.enum(['true', 'false']).transform((v) => v === 'true')])
    .default(defaultValue);

const originIds = ['custom', ...ORIGIN_PRESETS.map((o) => o.id as string)] as [string, ...string[]];
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

// R19 재구성: 예산 숫자 입력 폐지(추가 지불 의향으로 대체 — 실효 상한은 서비스가 파생),
// 희망 상영 시작 시간대·편도 이동 한도·우선순위 5축(+2순위)·현재 위치(custom origin) 추가.
// 구 URL 호환: maxPrice·priority='logistics'는 파싱은 허용하되 새 의미 체계로 흡수한다.
export const recommendationInputSchema = z
  .object({
    movieId: z.coerce.number().int().positive({ message: '영화를 선택해 주세요.' }),
    originId: z.enum(originIds).default('cityhall'),
    // originId='custom'(현재 위치)일 때의 좌표 — 대한민국 대략 범위로 제한한다.
    originLat: z.coerce.number().min(33).max(39).optional(),
    originLng: z.coerce.number().min(124).max(132).optional(),
    originLabel: z.string().max(40).optional(),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, '날짜 형식은 YYYY-MM-DD 입니다.')
      .default(DEMO_DATE),
    timeWindow: z.enum(['any', 'morning', 'afternoon', 'evening', 'late', 'custom']).default('any'),
    timeFrom: z.string().regex(HHMM, '시간 형식은 HH:MM 입니다.').optional(),
    timeTo: z.string().regex(HHMM, '시간 형식은 HH:MM 입니다.').optional(),
    maxTravelMinutes: z.coerce
      .number()
      .int()
      .min(5, '이동 한도는 5분 이상이어야 합니다.')
      .max(240, '이동 한도는 240분 이하여야 합니다.')
      .default(60),
    // 구 URL 호환용 — 새 플로우는 보내지 않는다. 값이 있으면 절대 상한으로 존중한다.
    maxPrice: z.coerce.number().int().min(1_000).max(200_000).optional(),
    premiumAllowance: z
      .enum(['price_first', 'plus_5000', 'plus_10000', 'experience_first'])
      .default('experience_first'),
    priority: z.enum(['balance', 'quality', 'seat', 'distance', 'price', 'logistics']).default('balance'),
    prioritySecondary: z.enum(['none', 'quality', 'seat', 'distance', 'price']).default('none'),
    allowImax: zBool(true),
    allowDolby: zBool(true),
    allowStandard: zBool(true),
    motionSickness: z.coerce.number().int().min(0).max(2).default(0),
    avoidFront: zBool(false),
    bigScreenSensitive: zBool(false),
    subtitleReadability: zBool(false),
    neckComfort: zBool(false),
    wheelchair: zBool(false),
  })
  .superRefine((v, ctx) => {
    if (v.timeWindow === 'custom' && (!v.timeFrom || !v.timeTo)) {
      ctx.addIssue({ code: 'custom', path: ['timeFrom'], message: '시간 범위를 입력해 주세요.' });
    }
    if (v.originId === 'custom' && (v.originLat === undefined || v.originLng === undefined)) {
      ctx.addIssue({ code: 'custom', path: ['originLat'], message: '현재 위치 좌표가 필요합니다.' });
    }
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
