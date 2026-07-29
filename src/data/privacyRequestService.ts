// 개인정보 삭제 요청 처리 — docs/PRIVATE-ALPHA.md/docs/DATA-RETENTION.md가 gap으로 남겨둔
// "사용자가 자신의 데이터를 열람·삭제 요청할 수 있는 창구"를 실제로 구현한다.
// 자동 즉시 실행하지 않고 관리자가 검토 후 complete()/reject()를 호출하는 이유는 (1) 감사
// 로그를 남기고 (2) 잘못된 세션 id·이메일 오타 같은 오남용을 거를 여지를 두기 위해서다.
import { deleteSessionData, previewSessionData, type SessionDataPreview, type SessionDeletionCounts } from './sessionDataDeletion';
import { getAppDbClient } from './client/index';
import type { DbClient } from './client/types';

export type PrivacyRequestType = 'session' | 'email';
export type PrivacyRequestStatus = 'pending' | 'completed' | 'rejected';

export interface PrivacyRequestRow {
  id: number;
  requestType: PrivacyRequestType;
  sessionId: string | null;
  contactEmail: string | null;
  message: string | null;
  status: PrivacyRequestStatus;
  requestedAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  resolutionNote: string | null;
  affectedSummary: unknown;
}

interface RawRow {
  id: number;
  request_type: string;
  session_id: string | null;
  contact_email: string | null;
  message: string | null;
  status: string;
  requested_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  resolution_note: string | null;
  affected_summary: string | null;
}

function toRow(r: RawRow): PrivacyRequestRow {
  return {
    id: r.id,
    requestType: r.request_type as PrivacyRequestType,
    sessionId: r.session_id,
    contactEmail: r.contact_email,
    message: r.message,
    status: r.status as PrivacyRequestStatus,
    requestedAt: r.requested_at,
    reviewedAt: r.reviewed_at,
    reviewedBy: r.reviewed_by,
    resolutionNote: r.resolution_note,
    affectedSummary: r.affected_summary ? JSON.parse(r.affected_summary) : null,
  };
}

const RATE_LIMIT_PER_HOUR = 3;

export type SubmitResult = { ok: true; id: number } | { ok: false; error: 'rate_limited' };
export type CompleteResult = { ok: true; affectedSummary: unknown } | { ok: false; error: 'not_found' | 'already_reviewed' };

export type PrivacyRequestPreview =
  | ({ type: 'session' } & SessionDataPreview)
  | { type: 'email'; matchingReports: { id: number; summary: string; submittedAt: string }[] };

export function createPrivacyRequestService(getDb: () => DbClient) {
  async function checkRateLimit(db: DbClient, sessionHash: string, now: Date): Promise<boolean> {
    const hourAgo = new Date(now.getTime() - 3_600_000).toISOString();
    const rows = await db.query<{ n: number }>(
      `SELECT COUNT(*) AS n FROM privacy_deletion_requests WHERE requester_session_hash = ? AND requested_at >= ?`,
      [sessionHash, hourAgo],
    );
    return Number(rows[0]?.n ?? 0) < RATE_LIMIT_PER_HOUR;
  }

  return {
    async submitSessionRequest(input: { sessionId: string; message: string; sessionHash: string; now: Date }): Promise<SubmitResult> {
      const db = getDb();
      if (!(await checkRateLimit(db, input.sessionHash, input.now))) return { ok: false, error: 'rate_limited' };
      const rows = await db.query<{ id: number }>(
        `INSERT INTO privacy_deletion_requests
           (request_type, session_id, contact_email, message, requester_session_hash, status, requested_at)
         VALUES ('session', ?, NULL, ?, ?, 'pending', ?) RETURNING id`,
        [input.sessionId, input.message || null, input.sessionHash, input.now.toISOString()],
      );
      return { ok: true, id: rows[0].id };
    },

    async submitEmailRequest(input: { contactEmail: string; message: string; sessionHash: string; now: Date }): Promise<SubmitResult> {
      const db = getDb();
      if (!(await checkRateLimit(db, input.sessionHash, input.now))) return { ok: false, error: 'rate_limited' };
      const rows = await db.query<{ id: number }>(
        `INSERT INTO privacy_deletion_requests
           (request_type, session_id, contact_email, message, requester_session_hash, status, requested_at)
         VALUES ('email', NULL, ?, ?, ?, 'pending', ?) RETURNING id`,
        [input.contactEmail, input.message || null, input.sessionHash, input.now.toISOString()],
      );
      return { ok: true, id: rows[0].id };
    },

    async list(filter?: { status?: PrivacyRequestStatus }): Promise<PrivacyRequestRow[]> {
      const db = getDb();
      const rows = filter?.status
        ? await db.query<RawRow>(`SELECT * FROM privacy_deletion_requests WHERE status = ? ORDER BY requested_at DESC`, [filter.status])
        : await db.query<RawRow>(`SELECT * FROM privacy_deletion_requests ORDER BY requested_at DESC`);
      return rows.map(toRow);
    },

    async get(id: number): Promise<PrivacyRequestRow | null> {
      const rows = await getDb().query<RawRow>(`SELECT * FROM privacy_deletion_requests WHERE id = ?`, [id]);
      return rows[0] ? toRow(rows[0]) : null;
    },

    async previewImpact(id: number): Promise<PrivacyRequestPreview | null> {
      const db = getDb();
      const rows = await db.query<RawRow>(`SELECT * FROM privacy_deletion_requests WHERE id = ?`, [id]);
      const req = rows[0] ? toRow(rows[0]) : null;
      if (!req) return null;
      if (req.requestType === 'session') {
        const preview = await previewSessionData(db, req.sessionId!);
        return { type: 'session', ...preview };
      }
      const matching = await db.query<{ id: number; summary: string; submitted_at: string }>(
        `SELECT id, summary, submitted_at FROM issue_reports WHERE contact_email = ? ORDER BY submitted_at DESC`,
        [req.contactEmail],
      );
      return { type: 'email', matchingReports: matching.map((m) => ({ id: m.id, summary: m.summary, submittedAt: m.submitted_at })) };
    },

    async complete(input: { id: number; actor: string; now: Date }): Promise<CompleteResult> {
      const db = getDb();
      return db.transaction(async (tx) => {
        const rows = await tx.query<RawRow>(`SELECT * FROM privacy_deletion_requests WHERE id = ?`, [input.id]);
        const req = rows[0];
        if (!req) return { ok: false, error: 'not_found' };
        if (req.status !== 'pending') return { ok: false, error: 'already_reviewed' };

        let affectedSummary: SessionDeletionCounts | { redactedReportIds: number[] };
        if (req.request_type === 'session') {
          affectedSummary = await deleteSessionData(tx, req.session_id!);
        } else {
          const matched = await tx.query<{ id: number }>(`SELECT id FROM issue_reports WHERE contact_email = ?`, [req.contact_email]);
          await tx.run(`UPDATE issue_reports SET contact_email = NULL WHERE contact_email = ?`, [req.contact_email]);
          affectedSummary = { redactedReportIds: matched.map((m) => m.id) };
        }

        const nowIso = input.now.toISOString();
        await tx.run(
          `UPDATE privacy_deletion_requests SET status = 'completed', reviewed_at = ?, reviewed_by = ?, affected_summary = ? WHERE id = ?`,
          [nowIso, input.actor, JSON.stringify(affectedSummary), input.id],
        );
        await tx.run(
          `INSERT INTO audit_logs (actor, action, target_type, target_id, detail, created_at) VALUES (?,?,?,?,?,?)`,
          [
            input.actor,
            'privacy_request_completed',
            'privacy_deletion_request',
            input.id,
            JSON.stringify({ requestType: req.request_type, affectedSummary }),
            nowIso,
          ],
        );
        return { ok: true, affectedSummary };
      });
    },

    async reject(input: { id: number; actor: string; now: Date; note?: string }): Promise<CompleteResult> {
      const db = getDb();
      return db.transaction(async (tx) => {
        const rows = await tx.query<RawRow>(`SELECT * FROM privacy_deletion_requests WHERE id = ?`, [input.id]);
        const req = rows[0];
        if (!req) return { ok: false, error: 'not_found' };
        if (req.status !== 'pending') return { ok: false, error: 'already_reviewed' };

        const nowIso = input.now.toISOString();
        await tx.run(
          `UPDATE privacy_deletion_requests SET status = 'rejected', reviewed_at = ?, reviewed_by = ?, resolution_note = ? WHERE id = ?`,
          [nowIso, input.actor, input.note ?? null, input.id],
        );
        await tx.run(
          `INSERT INTO audit_logs (actor, action, target_type, target_id, detail, created_at) VALUES (?,?,?,?,?,?)`,
          [input.actor, 'privacy_request_rejected', 'privacy_deletion_request', input.id, JSON.stringify({ note: input.note ?? null }), nowIso],
        );
        return { ok: true, affectedSummary: null };
      });
    },
  };
}

export const privacyRequestService = createPrivacyRequestService(getAppDbClient);
