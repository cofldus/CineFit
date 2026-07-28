// 관리자 제보 검토 액션 입력 검증 (공개 제보 입력은 reportValidation.ts)
import { z } from 'zod';

/** docs/06 §3.2 purpose 어휘 — 좌석 존 승격 시 이 목록만 허용 */
export const SEAT_ZONE_PURPOSES = [
  'immersive',
  'overview',
  'subtitle',
  'sound',
  'low_motion',
  'neck_easy',
  'exit_easy',
  'pair',
  'wheelchair',
] as const;

export const SEAT_ZONE_PURPOSE_LABELS: Record<(typeof SEAT_ZONE_PURPOSES)[number], string> = {
  immersive: '몰입',
  overview: '전체 조망',
  subtitle: '자막 가독',
  sound: '사운드',
  low_motion: '멀미 완화',
  neck_easy: '목 편안',
  exit_easy: '출입 용이',
  pair: '2인 관람',
  wheelchair: '휠체어',
};

const note = z.string().trim().max(500).optional();
const confidence = z.coerce.number().min(0.05, '신뢰도는 0.05 이상').max(1, '신뢰도는 1 이하');

const reviewSchema = z.object({
  action: z.enum(['under_review', 'needs_more_information', 'rejected', 'duplicate']),
  note,
});

const approveObservationSchema = z.object({
  action: z.literal('approve_observation'),
  field: z
    .string()
    .trim()
    .regex(/^[a-z0-9_.]{2,60}$/, 'field는 소문자·숫자·밑줄·점 2~60자'),
  confidence,
});

const promoteSeatZoneSchema = z.object({
  action: z.literal('promote_seat_zone'),
  purposes: z.array(z.enum(SEAT_ZONE_PURPOSES)).min(1, '목적을 1개 이상 선택').max(SEAT_ZONE_PURPOSES.length),
  rowRange: z.string().trim().max(40).optional().or(z.literal('').transform(() => undefined)),
  colRange: z.string().trim().max(40).optional().or(z.literal('').transform(() => undefined)),
  rationale: z.string().trim().min(5, '근거를 5자 이상 적어주세요.').max(500),
  confidence,
  supersedesSeatZoneId: z.coerce.number().int().positive().optional(),
});

export const adminReportActionSchema = z.discriminatedUnion('action', [
  reviewSchema,
  approveObservationSchema,
  promoteSeatZoneSchema,
]);

export type AdminReportAction = z.infer<typeof adminReportActionSchema>;

export function parseAdminReportAction(raw: unknown):
  | { ok: true; input: AdminReportAction }
  | { ok: false; errors: string[] } {
  const parsed = adminReportActionSchema.safeParse(raw);
  if (parsed.success) return { ok: true, input: parsed.data };
  return {
    ok: false,
    errors: parsed.error.issues.map((i) => `${i.path.join('.') || '입력'}: ${i.message}`),
  };
}
