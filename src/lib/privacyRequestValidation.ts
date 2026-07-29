import { z } from 'zod';

// 제어 문자 제거 — src/lib/reportValidation.ts의 stripControl과 동일한 코드 포인트 범위
function stripControl(s: string): string {
  let out = '';
  for (const ch of s) {
    const code = ch.codePointAt(0) ?? 0;
    const isControl = (code <= 0x08) || (code >= 0x0b && code <= 0x0c) || (code >= 0x0e && code <= 0x1f) || code === 0x7f;
    if (!isControl) out += ch;
  }
  return out;
}

const message = z
  .string()
  .transform(stripControl)
  .pipe(z.string().trim().max(500, '500자 이내로 적어주세요.'))
  .optional()
  .default('');

// honeypot — 사람 눈에는 보이지 않는 필드. 채워져 있으면 봇으로 간주해 거부한다.
const website = z.string().max(0, '').optional().default('');

export const sessionDeletionRequestSchema = z.object({ message, website });

export const emailDeletionRequestSchema = z.object({
  contactEmail: z.string().trim().toLowerCase().email('올바른 이메일 주소를 입력해 주세요.').max(200),
  message,
  website,
});

export type SessionDeletionRequestInput = z.infer<typeof sessionDeletionRequestSchema>;
export type EmailDeletionRequestInput = z.infer<typeof emailDeletionRequestSchema>;

type ParseResult<T> = { ok: true; input: T } | { ok: false; errors: string[] };

export function parseSessionDeletionRequest(body: unknown): ParseResult<SessionDeletionRequestInput> {
  const parsed = sessionDeletionRequestSchema.safeParse(body);
  if (!parsed.success) return { ok: false, errors: parsed.error.issues.map((i) => i.message) };
  return { ok: true, input: parsed.data };
}

export function parseEmailDeletionRequest(body: unknown): ParseResult<EmailDeletionRequestInput> {
  const parsed = emailDeletionRequestSchema.safeParse(body);
  if (!parsed.success) return { ok: false, errors: parsed.error.issues.map((i) => i.message) };
  return { ok: true, input: parsed.data };
}
