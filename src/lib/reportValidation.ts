import { z } from 'zod';

export const REPORT_TYPES = [
  'seat_zone',
  'auditorium_spec',
  'renovation',
  'accessibility',
  'operational_status',
  'showtime',
  'booking_link',
  'other',
] as const;

export const REPORT_TYPE_LABELS: Record<(typeof REPORT_TYPES)[number], string> = {
  seat_zone: '좌석 구역',
  auditorium_spec: '상영관 사양',
  renovation: '리뉴얼',
  accessibility: '접근성',
  operational_status: '운영 중단·폐점',
  showtime: '회차 정보 오류',
  booking_link: '예매 링크 오류',
  other: '기타',
};

export const REPORT_STATUS_LABELS: Record<string, string> = {
  submitted: '접수됨',
  under_review: '검토 중',
  needs_more_information: '추가 정보 필요',
  approved_as_observation: '관찰 기록 승인됨',
  promoted: '반영 완료',
  rejected: '반려됨',
  duplicate: '중복',
};

const stripControl = (s: string) => s.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '');

const safeUrl = z
  .string()
  .trim()
  .max(500, 'URL이 너무 깁니다.')
  .refine((u) => {
    try {
      const parsed = new URL(u);
      return parsed.protocol === 'https:' || parsed.protocol === 'http:';
    } catch {
      return false;
    }
  }, 'http(s) URL만 허용됩니다.');

export const publicReportSchema = z.object({
  reportType: z.enum(REPORT_TYPES),
  targetType: z.enum(['auditorium', 'showtime']),
  targetId: z.coerce.number().int().positive(),
  summary: z
    .string()
    .transform(stripControl)
    .pipe(z.string().trim().min(5, '내용을 5자 이상 적어주세요.').max(500, '500자 이내로 적어주세요.')),
  claimedValue: z
    .record(z.string().max(60), z.unknown())
    .refine((v) => JSON.stringify(v).length <= 4_000, '제보 내용이 너무 깁니다.'),
  evidenceUrl: safeUrl.optional().or(z.literal('').transform(() => undefined)),
  observedAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, '날짜 형식은 YYYY-MM-DD 입니다.')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  contactEmail: z
    .string()
    .email('이메일 형식이 아닙니다.')
    .max(200)
    .optional()
    .or(z.literal('').transform(() => undefined)),
  /** honeypot — 봇이 채우는 숨김 필드. 값이 있으면 거부. */
  website: z
    .string()
    .max(0, '요청을 처리할 수 없습니다.')
    .optional()
    .or(z.literal('').transform(() => undefined)),
});

export type PublicReportInput = z.infer<typeof publicReportSchema>;

export function parsePublicReport(raw: unknown):
  | { ok: true; input: PublicReportInput }
  | { ok: false; errors: string[] } {
  const parsed = publicReportSchema.safeParse(raw);
  if (parsed.success) return { ok: true, input: parsed.data };
  return {
    ok: false,
    errors: parsed.error.issues.map((i) => `${i.path.join('.') || '입력'}: ${i.message}`),
  };
}
