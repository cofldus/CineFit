// 추천 즉시 피드백 + 실제 선택 기록 — 둘 다 recommendation_runs를 참조하는 불변 로그(INSERT만).
import { getAppDbClient } from './client/index';
import type { DbClient } from './client/types';
import type { FeedbackInput, SelectionInput } from '../lib/feedbackValidation';

export function createFeedbackService(getDb: () => DbClient) {
  async function runExists(db: DbClient, runId: number): Promise<boolean> {
    return (await db.query<{ id: number }>(`SELECT id FROM recommendation_runs WHERE id = ?`, [runId])).length > 0;
  }

  return {
    async submitFeedback(
      runId: number,
      input: FeedbackInput,
      ctx: { sessionId: string; now: Date },
    ): Promise<{ ok: true; id: number } | { ok: false; error: string }> {
      const db = getDb();
      if (!(await runExists(db, runId))) return { ok: false, error: '추천 실행 기록을 찾을 수 없습니다.' };
      const rows = await db.query<{ id: number }>(
        `INSERT INTO recommendation_feedback
           (recommendation_run_id, showtime_id, helpfulness, reasons, free_text, session_id, created_at)
         VALUES (?,?,?,?,?,?,?) RETURNING id`,
        [
          runId,
          input.showtimeId ?? null,
          input.helpfulness,
          input.reasons?.length ? JSON.stringify(input.reasons) : null,
          input.freeText ?? null,
          ctx.sessionId,
          ctx.now.toISOString(),
        ],
      );
      return { ok: true, id: rows[0].id };
    },

    async submitSelection(
      runId: number,
      input: SelectionInput,
      ctx: { sessionId: string; now: Date },
    ): Promise<{ ok: true; id: number } | { ok: false; error: string }> {
      const db = getDb();
      if (!(await runExists(db, runId))) return { ok: false, error: '추천 실행 기록을 찾을 수 없습니다.' };
      const rows = await db.query<{ id: number }>(
        `INSERT INTO recommendation_selections
           (recommendation_run_id, selection_type, auditorium_id, reasons, session_id, created_at)
         VALUES (?,?,?,?,?,?) RETURNING id`,
        [
          runId,
          input.selectionType,
          input.auditoriumId ?? null,
          input.reasons?.length ? JSON.stringify(input.reasons) : null,
          ctx.sessionId,
          ctx.now.toISOString(),
        ],
      );
      return { ok: true, id: rows[0].id };
    },
  };
}

export const feedbackService = createFeedbackService(getAppDbClient);
