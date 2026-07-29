// 비공개 알파 초대 코드 + 참여 동의. private_alpha_gate 기능 플래그가 꺼져 있으면(기본값)
// 미들웨어가 이 테이블을 강제하지 않는다 — 이 서비스 자체는 항상 정확하게 동작해야 하지만,
// "언제 강제할지"는 middleware.ts가 플래그를 보고 결정한다(docs/PRIVATE-ALPHA.md).
import { randomBytes } from 'node:crypto';
import { getAppDbClient } from './client/index.ts';
import type { DbClient } from './client/types.ts';

export interface InviteCodeRow {
  id: number;
  code: string;
  description: string | null;
  maxUses: number | null;
  useCount: number;
  expiresAt: string | null;
  active: boolean;
  createdBy: string;
  createdAt: string;
}

function toRow(r: {
  id: number;
  code: string;
  description: string | null;
  max_uses: number | null;
  use_count: number;
  expires_at: string | null;
  active: number;
  created_by: string;
  created_at: string;
}): InviteCodeRow {
  return {
    id: r.id,
    code: r.code,
    description: r.description,
    maxUses: r.max_uses,
    useCount: r.use_count,
    expiresAt: r.expires_at,
    active: Boolean(r.active),
    createdBy: r.created_by,
    createdAt: r.created_at,
  };
}

const ROW_SELECT = `SELECT id, code, description, max_uses, use_count, expires_at, active, created_by, created_at FROM invite_codes`;

/** 사람이 손으로 옮기기 쉬운 코드 — 헷갈리는 문자(0/O, 1/I/L) 제외 */
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export function generateInviteCode(length = 8): string {
  const bytes = randomBytes(length);
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
}

export interface CreateInviteCodeInput {
  code?: string; // 생략하면 자동 생성
  description?: string | null;
  maxUses?: number | null;
  expiresAt?: string | null;
  actor: string;
  now?: () => Date;
  db?: DbClient;
}

export async function createInviteCode(input: CreateInviteCodeInput): Promise<InviteCodeRow> {
  const db = input.db ?? getAppDbClient();
  const code = input.code?.trim().toUpperCase() || generateInviteCode();
  const nowIso = (input.now?.() ?? new Date()).toISOString();
  const rows = await db.query<{ id: number }>(
    `INSERT INTO invite_codes (code, description, max_uses, use_count, expires_at, active, created_by, created_at)
     VALUES (?,?,?,0,?,1,?,?) RETURNING id`,
    [code, input.description ?? null, input.maxUses ?? null, input.expiresAt ?? null, input.actor, nowIso],
  );
  return toRow(
    (await db.query(`${ROW_SELECT} WHERE id = ?`, [rows[0].id]))[0] as Parameters<typeof toRow>[0],
  );
}

export async function listInviteCodes(db: DbClient = getAppDbClient()): Promise<InviteCodeRow[]> {
  const rows = await db.query(`${ROW_SELECT} ORDER BY created_at DESC`);
  return (rows as Parameters<typeof toRow>[0][]).map(toRow);
}

export async function setInviteCodeActive(
  id: number,
  active: boolean,
  db: DbClient = getAppDbClient(),
): Promise<{ ok: true } | { ok: false; error: string }> {
  const existing = (await db.query<{ id: number }>(`SELECT id FROM invite_codes WHERE id = ?`, [id]))[0];
  if (!existing) return { ok: false, error: '존재하지 않는 초대 코드입니다.' };
  await db.run(`UPDATE invite_codes SET active = ? WHERE id = ?`, [active ? 1 : 0, id]);
  return { ok: true };
}

export type RedeemOutcome =
  | { ok: true; alreadyRedeemedByThisSession: boolean }
  | { ok: false; error: 'not_found' | 'inactive' | 'expired' | 'exhausted' };

/** 세션당 한 번만 use_count를 올린다(같은 세션이 같은 코드를 다시 제출해도 중복 소모 없음). */
export async function redeemInviteCode(
  code: string,
  ctx: { sessionId: string; now?: () => Date; db?: DbClient },
): Promise<RedeemOutcome> {
  const db = ctx.db ?? getAppDbClient();
  const nowIso = (ctx.now?.() ?? new Date()).toISOString();
  const normalized = code.trim().toUpperCase();

  const invite = (
    await db.query<{ id: number; use_count: number; max_uses: number | null; expires_at: string | null; active: number }>(
      `SELECT id, use_count, max_uses, expires_at, active FROM invite_codes WHERE code = ?`,
      [normalized],
    )
  )[0];
  if (!invite) return { ok: false, error: 'not_found' };
  if (!invite.active) return { ok: false, error: 'inactive' };
  if (invite.expires_at && invite.expires_at < nowIso) return { ok: false, error: 'expired' };

  const already = (
    await db.query<{ id: number }>(
      `SELECT id FROM invite_code_redemptions WHERE invite_code_id = ? AND session_id = ?`,
      [invite.id, ctx.sessionId],
    )
  )[0];
  if (already) return { ok: true, alreadyRedeemedByThisSession: true };

  if (invite.max_uses !== null && invite.use_count >= invite.max_uses) return { ok: false, error: 'exhausted' };

  return db.transaction(async (tx) => {
    await tx.run(
      `INSERT INTO invite_code_redemptions (invite_code_id, session_id, redeemed_at) VALUES (?,?,?)`,
      [invite.id, ctx.sessionId, nowIso],
    );
    await tx.run(`UPDATE invite_codes SET use_count = use_count + 1 WHERE id = ?`, [invite.id]);
    return { ok: true, alreadyRedeemedByThisSession: false };
  });
}

export async function recordAlphaConsent(sessionId: string, now: Date = new Date(), db: DbClient = getAppDbClient()): Promise<void> {
  await db.run(
    `INSERT INTO alpha_consents (session_id, consented_at) VALUES (?,?)
     ON CONFLICT (session_id) DO NOTHING`,
    [sessionId, now.toISOString()],
  );
}

export async function hasAlphaConsent(sessionId: string, db: DbClient = getAppDbClient()): Promise<boolean> {
  const rows = await db.query<{ session_id: string }>(`SELECT session_id FROM alpha_consents WHERE session_id = ?`, [
    sessionId,
  ]);
  return rows.length > 0;
}
