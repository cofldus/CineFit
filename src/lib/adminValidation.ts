import { z } from 'zod';

const zBool = (defaultValue: boolean) =>
  z
    .union([z.boolean(), z.enum(['true', 'false']).transform((v) => v === 'true')])
    .default(defaultValue);

export const SHOWTIME_FORMATS = ['imax', 'dolby_cinema', '4dx', 'screenx', 'superplex', 'standard'] as const;

export const adminShowtimeSchema = z.object({
  movieId: z.coerce.number().int().positive({ message: '영화를 선택하세요.' }),
  auditoriumId: z.coerce.number().int().positive({ message: '상영관을 선택하세요.' }),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '상영 날짜는 YYYY-MM-DD 형식입니다.'),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, '시작 시각은 HH:MM 형식입니다.'),
  endTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, '종료 시각은 HH:MM 형식입니다.')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  crossesMidnight: zBool(false), // 심야 회차: 종료가 자정을 넘는 경우 명시
  format: z.enum(SHOWTIME_FORMATS),
  is3d: zBool(false),
  language: z.enum(['sub', 'dub', 'none']).default('sub'),
  price: z.coerce.number().int().min(0, '가격은 0 이상이어야 합니다.').max(1_000_000),
  bookingUrl: z
    .string()
    .min(1, '공식 예매 URL을 입력하세요.')
    .refine((u) => {
      try {
        const parsed = new URL(u);
        return parsed.protocol === 'https:' || parsed.protocol === 'http:';
      } catch {
        return false;
      }
    }, '유효한 http(s) URL이 아닙니다.'),
  sourceNote: z.string().min(1, '정보 출처를 입력하세요 (예: CGV 공식 예매 페이지).'),
  infoStatus: z.enum(['official', 'multi_source', 'user_report', 'single_unverified']).default('official'),
  isSynthetic: zBool(false),
  status: z.enum(['active', 'disabled']).default('active'),
  adminNote: z.string().optional().or(z.literal('').transform(() => undefined)),
  mismatchNote: z.string().optional().or(z.literal('').transform(() => undefined)), // 포맷 불일치 근거
});

export type AdminShowtimeInput = z.infer<typeof adminShowtimeSchema>;

export function parseAdminShowtimeInput(raw: unknown):
  | { ok: true; input: AdminShowtimeInput }
  | { ok: false; errors: string[] } {
  const parsed = adminShowtimeSchema.safeParse(raw);
  if (parsed.success) return { ok: true, input: parsed.data };
  return {
    ok: false,
    errors: parsed.error.issues.map((i) => `${i.path.join('.') || '입력'}: ${i.message}`),
  };
}
