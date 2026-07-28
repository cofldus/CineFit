// 관람후 만족도 — 추천 실행에 포함된 회차 중 하나라도 이미 시작한 뒤에만 제출을 허용한다
// ("관람하지 않은 사용자 평가가 관람후 평가로 저장되지 않게" — 섹션 9). 티켓 실제 사용 여부는
// 검증할 수 없으므로 "시작 시각이 지났는지"까지만 확인하는 근사치다.
import { getAppDbClient } from './client/index';
import type { DbClient } from './client/types';
import { recommendationRepository } from './recommendationRepository';
import type { PostWatchSurveyInput } from '../lib/postWatchValidation';

export type PostWatchResult =
  | { ok: true; id: number }
  | { ok: false; code: 'run_not_found' | 'not_started_yet'; error: string };

export function createPostWatchService(getDb: () => DbClient) {
  return {
    async submit(runId: number, input: PostWatchSurveyInput, ctx: { sessionId: string; now: Date }): Promise<PostWatchResult> {
      const summary = await recommendationRepository.getRunSummary(runId);
      if (!summary) return { ok: false, code: 'run_not_found', error: '추천 실행 기록을 찾을 수 없습니다.' };

      if (summary.showtimeIds.length > 0) {
        const placeholders = summary.showtimeIds.map(() => '?').join(',');
        const rows = await getDb().query<{ starts_at: string }>(
          `SELECT starts_at FROM showtimes WHERE id IN (${placeholders})`,
          summary.showtimeIds,
        );
        const anyStarted = rows.some((r) => new Date(r.starts_at).getTime() <= ctx.now.getTime());
        if (!anyStarted) {
          return { ok: false, code: 'not_started_yet', error: '아직 상영 시간이 되지 않았어요 — 관람 후에 남겨주세요.' };
        }
      }

      const rows = await getDb().query<{ id: number }>(
        `INSERT INTO post_watch_surveys
           (recommendation_run_id, overall_satisfaction, info_accuracy, seat_satisfaction, screen_satisfaction,
            sound_satisfaction, travel_time_accuracy, price_accuracy, would_choose_again, would_reuse_cinefit,
            session_id, created_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?) RETURNING id`,
        [
          runId,
          input.overallSatisfaction,
          input.infoAccuracy ?? null,
          input.seatSatisfaction ?? null,
          input.screenSatisfaction ?? null,
          input.soundSatisfaction ?? null,
          input.travelTimeAccuracy ?? null,
          input.priceAccuracy ?? null,
          input.wouldChooseAgain ?? null,
          input.wouldReuseCinefit ?? null,
          ctx.sessionId,
          ctx.now.toISOString(),
        ],
      );
      return { ok: true, id: rows[0].id };
    },
  };
}

export const postWatchService = createPostWatchService(getAppDbClient);
