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

// R21 §8 — 알파 품질 지표: 완료율·공식 링크 클릭률·도움됨 비율·zero result 조건·정책별 결과.
export interface ZeroResultCondition {
  movieId: number;
  timeWindow: string;
  maxTravelMinutes: number;
  priority: string;
  count: number;
}

export interface PolicyBreakdownRow {
  policyVersion: string;
  runCount: number;
  zeroCount: number;
}

export interface AlphaQualityStats {
  /** recommendation_generated에 도달한 고유 세션 수 */
  generatedSessions: number;
  /** 공식 링크(official_link_clicked ∪ booking_link_clicked) 클릭 고유 세션 수 */
  officialClickSessions: number;
  officialLinkCtrPercent: number;
  helpfulCount: number;
  unhelpfulCount: number;
  helpfulRatePercent: number;
  zeroResultCount: number;
  zeroResultConditions: ZeroResultCondition[];
  policyBreakdown: PolicyBreakdownRow[];
}

export interface AlphaOpsSummary {
  inviteCodes: InviteCodeStats;
  consent: ConsentStats;
  funnel: FunnelStageResult[];
  quality: AlphaQualityStats;
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

      // R21 §8 품질 지표 — 전부 화이트리스트 이벤트·runs 테이블만 사용(비민감).
      const [generatedSessions, officialClickSessions, helpfulCount, unhelpfulCount, zeroResultCount] =
        await Promise.all([
          countOne(
            db,
            `SELECT COUNT(DISTINCT session_id) AS n FROM analytics_events WHERE event_name = 'recommendation_generated'`,
          ),
          countOne(
            db,
            `SELECT COUNT(DISTINCT session_id) AS n FROM analytics_events
             WHERE event_name IN ('official_link_clicked','booking_link_clicked')`,
          ),
          countOne(db, `SELECT COUNT(*) AS n FROM analytics_events WHERE event_name = 'recommendation_helpful'`),
          countOne(db, `SELECT COUNT(*) AS n FROM analytics_events WHERE event_name = 'recommendation_unhelpful'`),
          countOne(db, `SELECT COUNT(*) AS n FROM analytics_events WHERE event_name = 'zero_results_shown'`),
        ]);

      // zero result 발생 조건 — 최근 100건의 속성(비민감 요약)을 조건 조합별로 집계.
      const zeroRows = await db.query<{ properties: string }>(
        `SELECT properties FROM analytics_events WHERE event_name = 'zero_results_shown' ORDER BY id DESC LIMIT 100`,
      );
      const zeroMap = new Map<string, ZeroResultCondition>();
      for (const row of zeroRows) {
        try {
          const p = JSON.parse(row.properties) as {
            movieId?: number;
            timeWindow?: string;
            maxTravelMinutes?: number;
            priority?: string;
          };
          const key = `${p.movieId}|${p.timeWindow}|${p.maxTravelMinutes}|${p.priority}`;
          const cur = zeroMap.get(key);
          if (cur) cur.count += 1;
          else
            zeroMap.set(key, {
              movieId: p.movieId ?? 0,
              timeWindow: p.timeWindow ?? 'any',
              maxTravelMinutes: p.maxTravelMinutes ?? 0,
              priority: p.priority ?? '-',
              count: 1,
            });
        } catch {
          /* 손상 행 무시 */
        }
      }
      const zeroResultConditions = [...zeroMap.values()].sort((a, b) => b.count - a.count).slice(0, 10);

      // 정책 버전별 실행·zero 비율 — recommendation_runs 기준.
      const policyRows = await db.query<{ policy_version: string | null; n: number; zero: number }>(
        `SELECT policy_version, COUNT(*) AS n,
                SUM(CASE WHEN results = '[]' THEN 1 ELSE 0 END) AS zero
         FROM recommendation_runs GROUP BY policy_version ORDER BY n DESC`,
      );

      return {
        inviteCodes: { totalCodes, activeCodes, totalRedemptions, distinctRedeemedSessions },
        consent: {
          totalSessions,
          consentedSessions,
          consentRatePercent: totalSessions > 0 ? Math.round((consentedSessions / totalSessions) * 1000) / 10 : 0,
        },
        funnel: computeFunnelPercentages(funnelCounts),
        quality: {
          generatedSessions,
          officialClickSessions,
          officialLinkCtrPercent:
            generatedSessions > 0 ? Math.round((officialClickSessions / generatedSessions) * 1000) / 10 : 0,
          helpfulCount,
          unhelpfulCount,
          helpfulRatePercent:
            helpfulCount + unhelpfulCount > 0
              ? Math.round((helpfulCount / (helpfulCount + unhelpfulCount)) * 1000) / 10
              : 0,
          zeroResultCount,
          zeroResultConditions,
          policyBreakdown: policyRows.map((r) => ({
            policyVersion: r.policy_version ?? '(없음)',
            runCount: Number(r.n),
            zeroCount: Number(r.zero ?? 0),
          })),
        },
      };
    },
  };
}

export const alphaOpsRepository = createAlphaOpsRepository(getAppDbClient);
