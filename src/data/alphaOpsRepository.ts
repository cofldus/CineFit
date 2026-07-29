// 알파 운영 대시보드(/admin/alpha-ops) 데이터 — 초대·동의 현황과 사용 퍼널을 원시 건수 +
// 백분율로 보여준다. docs/ANALYTICS.md "현재 한계"가 gap으로 남겨둔 "집계·시각화 대시보드
// 없음"을 해소한다.
import { computeFunnelPercentages, FUNNEL_STAGES, type FunnelStageResult } from '../domain/alphaOps/funnel';
import { getAppDbClient } from './client/index';
import type { DbClient } from './client/types';

export interface InviteCodeStats {
  totalCodes: number;
  activeCodes: number;
  totalRedemptions: number;
  distinctRedeemedSessions: number;
}

export interface ConsentStats {
  totalSessions: number;
  consentedSessions: number;
  /** 전체 세션 대비 동의 완료 비율(%) — 게이트가 꺼져 있으면 대부분 0에 가깝다(정상). */
  consentRatePercent: number;
}

export interface AlphaOpsSummary {
  inviteCodes: InviteCodeStats;
  consent: ConsentStats;
  funnel: FunnelStageResult[];
}

async function countOne(db: DbClient, sql: string, params: unknown[] = []): Promise<number> {
  const rows = await db.query<{ n: number }>(sql, params);
  return Number(rows[0]?.n ?? 0);
}

export function createAlphaOpsRepository(getDb: () => DbClient) {
  return {
    async getSummary(): Promise<AlphaOpsSummary> {
      const db = getDb();

      const [totalCodes, activeCodes, totalRedemptions, distinctRedeemedSessions, totalSessions, consentedSessions] =
        await Promise.all([
          countOne(db, `SELECT COUNT(*) AS n FROM invite_codes`),
          countOne(db, `SELECT COUNT(*) AS n FROM invite_codes WHERE active = 1`),
          countOne(db, `SELECT COUNT(*) AS n FROM invite_code_redemptions`),
          countOne(db, `SELECT COUNT(DISTINCT session_id) AS n FROM invite_code_redemptions`),
          countOne(db, `SELECT COUNT(*) AS n FROM analytics_sessions`),
          countOne(db, `SELECT COUNT(*) AS n FROM alpha_consents`),
        ]);

      const funnelCounts = await Promise.all(
        FUNNEL_STAGES.map(async (stage) => ({
          key: stage.key,
          label: stage.label,
          sessionCount: await countOne(db, `SELECT COUNT(DISTINCT session_id) AS n FROM analytics_events WHERE event_name = ?`, [
            stage.key,
          ]),
        })),
      );

      return {
        inviteCodes: { totalCodes, activeCodes, totalRedemptions, distinctRedeemedSessions },
        consent: {
          totalSessions,
          consentedSessions,
          consentRatePercent: totalSessions > 0 ? Math.round((consentedSessions / totalSessions) * 1000) / 10 : 0,
        },
        funnel: computeFunnelPercentages(funnelCounts),
      };
    },
  };
}

export const alphaOpsRepository = createAlphaOpsRepository(getAppDbClient);
