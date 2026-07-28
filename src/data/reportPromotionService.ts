// 제보 승격 서비스 — 검토 완료된 제보를 관찰 기록(observations)·좌석 존으로 승격한다.
// 원칙(docs/DATA-PROMOTION-POLICY.md):
//  - 승격은 항상 관찰 기록을 거친다. 제보 원문·기존 존을 덮어쓰지 않는다(계보로 대체).
//  - 신뢰도는 confidencePolicy 상한을 넘을 수 없고 info_status는 user_report 고정 — official 승격 금지.
import { capReportConfidence, USER_REPORT_INFO_STATUS } from '../domain/trust/confidencePolicy';
import { seoulDateString } from '../lib/clock';
import { getAppDbClient } from './client/index';
import type { DbClient } from './client/types';
import type { ReportRow } from './reportService';

export interface ApproveObservationInput {
  /** observations.field — 예: 'screen.aspect', 'seat_zone' */
  field: string;
  /** 관리자가 요청한 신뢰도 — 정책 상한으로 캡된다 */
  confidence: number;
}

export interface PromoteSeatZoneInput {
  purposes: string[];
  rowRange?: string;
  colRange?: string;
  rationale: string;
  confidence: number;
  /** 이 존이 대체하는 기존 존 id — 대체된 존은 is_active=0, valid_to 마감 */
  supersedesSeatZoneId?: number;
}

export interface PromotionCtx {
  actor: string;
  now: Date;
}

export type PromotionResult =
  | { ok: true; observationId: number; confidence: number; seatZoneId?: number }
  | { ok: false; error: string };

/** 승격 가능한 시작 상태 — 반려·중복·이미 승격된 제보는 다시 승격할 수 없다 */
const PROMOTABLE_STATUSES = new Set(['submitted', 'under_review', 'needs_more_information', 'approved_as_observation']);

const USER_REPORT_SOURCE_NAME = '사용자 제보';

export function createReportPromotionService(getDb: () => DbClient) {
  async function ensureUserReportSource(tx: DbClient): Promise<number> {
    const existing = await tx.query<{ id: number }>(
      `SELECT id FROM sources WHERE kind = 'user_report' AND name = ? LIMIT 1`,
      [USER_REPORT_SOURCE_NAME],
    );
    if (existing[0]) return existing[0].id;
    const rows = await tx.query<{ id: number }>(
      `INSERT INTO sources (kind, name, terms_note, trust_weight)
       VALUES ('user_report', ?, '익명 사용자 제보 — 관리자 검토 후 제한 신뢰도로만 반영', 0.5) RETURNING id`,
      [USER_REPORT_SOURCE_NAME],
    );
    return rows[0].id;
  }

  /** 동일 대상·유형의 서로 다른 세션 제보 수 (반려·중복 제외, 본인 포함) */
  async function independentReportCount(tx: DbClient, report: ReportRow): Promise<number> {
    const rows = await tx.query<{ n: number }>(
      `SELECT COUNT(DISTINCT anonymous_session_hash) AS n FROM issue_reports
       WHERE target_type = ? AND target_id = ? AND report_type = ?
         AND status NOT IN ('rejected','duplicate')`,
      [report.target_type, report.target_id, report.report_type],
    );
    return Number(rows[0].n);
  }

  async function loadPromotable(tx: DbClient, id: number): Promise<{ report: ReportRow } | { error: string }> {
    const report = (await tx.query<ReportRow>(`SELECT * FROM issue_reports WHERE id = ?`, [id]))[0];
    if (!report) return { error: '제보를 찾을 수 없습니다.' };
    if (report.status === 'promoted') return { error: '이미 반영 완료된 제보입니다.' };
    if (!PROMOTABLE_STATUSES.has(report.status)) return { error: '반려·중복 처리된 제보는 승격할 수 없습니다.' };
    return { report };
  }

  async function insertObservation(
    tx: DbClient,
    report: ReportRow,
    field: string,
    cappedConfidence: number,
    ctx: PromotionCtx,
  ): Promise<number> {
    const sourceId = await ensureUserReportSource(tx);
    const rows = await tx.query<{ id: number }>(
      `INSERT INTO observations (entity_type, entity_id, field, value, source_id, observed_at, info_status, confidence)
       VALUES (?,?,?,?,?,?,?,?) RETURNING id`,
      [
        report.target_type,
        report.target_id,
        field,
        report.claimed_value_json,
        sourceId,
        report.observed_at ?? seoulDateString(ctx.now),
        USER_REPORT_INFO_STATUS,
        cappedConfidence,
      ],
    );
    return rows[0].id;
  }

  async function auditLog(tx: DbClient, ctx: PromotionCtx, action: string, reportId: number, detail: unknown) {
    await tx.run(
      `INSERT INTO audit_logs (actor, action, target_type, target_id, detail, created_at) VALUES (?,?,?,?,?,?)`,
      [ctx.actor, action, 'issue_report', reportId, JSON.stringify(detail), ctx.now.toISOString()],
    );
  }

  return {
    /** 제보를 관찰 기록으로 승인 — 추천 데이터에 직접 반영되지는 않는다 */
    async approveAsObservation(id: number, input: ApproveObservationInput, ctx: PromotionCtx): Promise<PromotionResult> {
      return getDb().transaction(async (tx) => {
        const loaded = await loadPromotable(tx, id);
        if ('error' in loaded) return { ok: false, error: loaded.error };
        const { report } = loaded;
        if (report.status === 'approved_as_observation') {
          return { ok: false, error: '이미 관찰 기록으로 승인된 제보입니다.' };
        }

        const confidence = capReportConfidence(input.confidence, {
          hasEvidenceUrl: report.evidence_url != null,
          independentReportCount: await independentReportCount(tx, report),
        });
        const observationId = await insertObservation(tx, report, input.field, confidence, ctx);

        const nowIso = ctx.now.toISOString();
        await tx.run(
          `UPDATE issue_reports SET status = 'approved_as_observation', promoted_observation_id = ?,
             reviewed_at = ?, reviewed_by = ?, updated_at = ? WHERE id = ?`,
          [observationId, nowIso, ctx.actor, nowIso, id],
        );
        await auditLog(tx, ctx, 'report_approved_as_observation', id, { observationId, field: input.field, confidence });
        return { ok: true, observationId, confidence };
      });
    },

    /** 좌석 존 제보를 실제 존으로 승격 — 기존 존은 계보로 대체(삭제 금지) */
    async promoteSeatZone(id: number, input: PromoteSeatZoneInput, ctx: PromotionCtx): Promise<PromotionResult> {
      return getDb().transaction(async (tx) => {
        const loaded = await loadPromotable(tx, id);
        if ('error' in loaded) return { ok: false, error: loaded.error };
        const { report } = loaded;
        if (report.report_type !== 'seat_zone' || report.target_type !== 'auditorium') {
          return { ok: false, error: '좌석 구역 제보(상영관 대상)만 좌석 존으로 승격할 수 있습니다.' };
        }

        const confidence = capReportConfidence(input.confidence, {
          hasEvidenceUrl: report.evidence_url != null,
          independentReportCount: await independentReportCount(tx, report),
        });

        // 관찰 기록이 이미 있으면(사전 승인) 재사용, 없으면 이 트랜잭션에서 생성
        const observationId =
          report.promoted_observation_id ?? (await insertObservation(tx, report, 'seat_zone', confidence, ctx));

        const nowIso = ctx.now.toISOString();
        let supersedes: number | null = null;
        if (input.supersedesSeatZoneId !== undefined) {
          const prev = await tx.query<{ id: number }>(
            `SELECT id FROM seat_zones WHERE id = ? AND auditorium_id = ? AND is_active = 1`,
            [input.supersedesSeatZoneId, report.target_id],
          );
          if (!prev[0]) return { ok: false, error: '대체 대상 존이 해당 상영관의 활성 존이 아닙니다.' };
          await tx.run(`UPDATE seat_zones SET is_active = 0, valid_to = ? WHERE id = ?`, [nowIso, prev[0].id]);
          supersedes = prev[0].id;
        }

        const sourceId = await ensureUserReportSource(tx);
        const zoneRows = await tx.query<{ id: number }>(
          `INSERT INTO seat_zones
             (auditorium_id, purpose, row_range, col_range, rationale, source_id, info_status, observed_at,
              confidence, valid_from, is_active, supersedes_seat_zone_id, source_observation_id, reviewed_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,1,?,?,?) RETURNING id`,
          [
            report.target_id,
            JSON.stringify(input.purposes),
            input.rowRange ?? null,
            input.colRange ?? null,
            input.rationale,
            sourceId,
            USER_REPORT_INFO_STATUS,
            report.observed_at ?? seoulDateString(ctx.now),
            confidence,
            nowIso,
            supersedes,
            observationId,
            nowIso,
          ],
        );
        const seatZoneId = zoneRows[0].id;

        await tx.run(
          `UPDATE issue_reports SET status = 'promoted', promoted_observation_id = ?,
             promoted_entity_type = 'seat_zone', promoted_entity_id = ?,
             reviewed_at = ?, reviewed_by = ?, updated_at = ? WHERE id = ?`,
          [observationId, seatZoneId, nowIso, ctx.actor, nowIso, id],
        );
        await auditLog(tx, ctx, 'report_promoted_seat_zone', id, {
          observationId,
          seatZoneId,
          supersedes,
          confidence,
        });
        return { ok: true, observationId, confidence, seatZoneId };
      });
    },
  };
}

export const reportPromotionService = createReportPromotionService(getAppDbClient);
