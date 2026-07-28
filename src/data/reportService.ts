// 사실형 제보 서비스 — 생성(공개)·상태 조회·목록·검토 상태 전이.
// 원칙: 제보 생성만으로는 어떤 추천 데이터에도 반영되지 않는다. 원본 제보는 삭제·덮어쓰기 금지.
import { getAppDbClient } from './client/index';
import type { DbClient } from './client/types';
import type { PublicReportInput } from '../lib/reportValidation';

export interface ReportRow {
  id: number;
  report_type: string;
  target_type: string;
  target_id: number;
  status: string;
  summary: string;
  claimed_value_json: string;
  evidence_url: string | null;
  observed_at: string | null;
  submitted_at: string;
  anonymous_session_hash: string;
  contact_email: string | null;
  moderator_note: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  resolution: string | null;
  promoted_observation_id: number | null;
  promoted_entity_type: string | null;
  promoted_entity_id: number | null;
  created_at: string;
  updated_at: string;
}

export type CreateReportResult =
  | { ok: true; id: number; duplicateSuspect: boolean }
  | { ok: false; code: 'rate_limited' | 'target_not_found'; message: string };

export interface ReportListFilters {
  status?: string;
  reportType?: string;
  targetType?: string;
  targetId?: number;
  hasEvidence?: boolean;
  from?: string;
  to?: string;
}

const RATE_LIMIT_PER_HOUR = 5;
export type ReviewAction = 'under_review' | 'needs_more_information' | 'rejected' | 'duplicate';

export function createReportService(getDb: () => DbClient) {
  async function targetExists(db: DbClient, targetType: string, targetId: number): Promise<boolean> {
    const table = targetType === 'auditorium' ? 'auditoriums' : 'showtimes';
    return (await db.query<{ id: number }>(`SELECT id FROM ${table} WHERE id = ?`, [targetId])).length > 0;
  }

  async function auditLog(
    db: DbClient,
    actor: string,
    action: string,
    targetType: string,
    targetId: number,
    detail: unknown,
    nowIso: string,
  ): Promise<void> {
    await db.run(
      `INSERT INTO audit_logs (actor, action, target_type, target_id, detail, created_at) VALUES (?,?,?,?,?,?)`,
      [actor, action, targetType, targetId, detail ? JSON.stringify(detail) : null, nowIso],
    );
  }

  return {
    auditLog,

    async create(input: PublicReportInput, ctx: { sessionHash: string; now: Date }): Promise<CreateReportResult> {
      const db = getDb();
      const nowIso = ctx.now.toISOString();

      if (!(await targetExists(db, input.targetType, input.targetId))) {
        return { ok: false, code: 'target_not_found', message: '제보 대상을 찾을 수 없습니다.' };
      }

      // rate limit — 동일 세션 최근 1시간 제출 수 (DB 기준, 다중 인스턴스 안전)
      const hourAgo = new Date(ctx.now.getTime() - 3_600_000).toISOString();
      const recent = await db.query<{ n: number }>(
        `SELECT COUNT(*) AS n FROM issue_reports WHERE anonymous_session_hash = ? AND created_at >= ?`,
        [ctx.sessionHash, hourAgo],
      );
      if (Number(recent[0].n) >= RATE_LIMIT_PER_HOUR) {
        return { ok: false, code: 'rate_limited', message: '제보가 너무 잦습니다. 잠시 후 다시 시도해 주세요.' };
      }

      // 중복 의심 — 같은 대상·유형의 최근 7일 미반려 제보 존재
      const weekAgo = new Date(ctx.now.getTime() - 7 * 86_400_000).toISOString();
      const similar = await db.query<{ n: number }>(
        `SELECT COUNT(*) AS n FROM issue_reports
         WHERE target_type = ? AND target_id = ? AND report_type = ?
           AND created_at >= ? AND status NOT IN ('rejected','duplicate')`,
        [input.targetType, input.targetId, input.reportType, weekAgo],
      );

      const rows = await db.query<{ id: number }>(
        `INSERT INTO issue_reports
           (report_type, target_type, target_id, status, summary, claimed_value_json, evidence_url,
            observed_at, submitted_at, anonymous_session_hash, contact_email, source_type, created_at, updated_at)
         VALUES (?,?,?,'submitted',?,?,?,?,?,?,?,'user_report',?,?) RETURNING id`,
        [
          input.reportType,
          input.targetType,
          input.targetId,
          input.summary,
          JSON.stringify(input.claimedValue),
          input.evidenceUrl ?? null,
          input.observedAt ?? null,
          nowIso,
          ctx.sessionHash,
          input.contactEmail ?? null,
          nowIso,
          nowIso,
        ],
      );
      return { ok: true, id: rows[0].id, duplicateSuspect: Number(similar[0].n) > 0 };
    },

    /** 공개 상태 조회 — 개인정보·관리자 메모 미노출 */
    async getPublicStatus(id: number): Promise<{ status: string; submittedAt: string; resolution: string | null } | null> {
      const rows = await getDb().query<{ status: string; submitted_at: string; resolution: string | null }>(
        `SELECT status, submitted_at, resolution FROM issue_reports WHERE id = ?`,
        [id],
      );
      return rows[0] ? { status: rows[0].status, submittedAt: rows[0].submitted_at, resolution: rows[0].resolution } : null;
    },

    async list(filters: ReportListFilters = {}): Promise<ReportRow[]> {
      const where: string[] = [];
      const params: (string | number)[] = [];
      if (filters.status) {
        where.push('status = ?');
        params.push(filters.status);
      }
      if (filters.reportType) {
        where.push('report_type = ?');
        params.push(filters.reportType);
      }
      if (filters.targetType) {
        where.push('target_type = ?');
        params.push(filters.targetType);
      }
      if (filters.targetId) {
        where.push('target_id = ?');
        params.push(filters.targetId);
      }
      if (filters.hasEvidence !== undefined) where.push(`evidence_url IS ${filters.hasEvidence ? 'NOT ' : ''}NULL`);
      if (filters.from) {
        where.push('created_at >= ?');
        params.push(filters.from);
      }
      if (filters.to) {
        where.push('created_at <= ?');
        params.push(filters.to);
      }
      return getDb().query<ReportRow>(
        `SELECT * FROM issue_reports ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY created_at DESC LIMIT 200`,
        params,
      );
    },

    async get(id: number): Promise<ReportRow | null> {
      return (await getDb().query<ReportRow>(`SELECT * FROM issue_reports WHERE id = ?`, [id]))[0] ?? null;
    },

    /** 검토 상태 전이 (승인·승격은 promotionService 담당) — 처리 이력은 audit_logs에 남는다 */
    async review(
      id: number,
      action: ReviewAction,
      ctx: { actor: string; note?: string; now: Date },
    ): Promise<{ ok: boolean; error?: string }> {
      const db = getDb();
      const nowIso = ctx.now.toISOString();
      return db.transaction(async (tx) => {
        const report = (await tx.query<ReportRow>(`SELECT * FROM issue_reports WHERE id = ?`, [id]))[0];
        if (!report) return { ok: false, error: '제보를 찾을 수 없습니다.' };
        if (report.status === 'promoted') return { ok: false, error: '이미 반영 완료된 제보입니다.' };
        await tx.run(
          `UPDATE issue_reports SET status = ?, moderator_note = COALESCE(?, moderator_note),
             reviewed_at = ?, reviewed_by = ?, updated_at = ?,
             resolution = CASE WHEN ? IN ('rejected','duplicate') THEN ? ELSE resolution END
           WHERE id = ?`,
          [action, ctx.note ?? null, nowIso, ctx.actor, nowIso, action, ctx.note ?? action, id],
        );
        await auditLog(tx, ctx.actor, `report_${action}`, 'issue_report', id, { note: Boolean(ctx.note) }, nowIso);
        return { ok: true };
      });
    },
  };
}

export const reportService = createReportService(getAppDbClient);
