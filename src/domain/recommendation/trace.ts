// R21 §3 — recommendation trace v1. 추천 한 번을 "왜 제외됐는지·왜 1위인지"까지
// 재현할 수 있는 구조로 요약해 recommendation_runs.trace(JSON)에 저장한다.
// 새 계산 없음: 엔진 결과(stage 태그·softPenalties·axes)를 그대로 재구성한다.
import { AXIS_ORDER, axisWeights, type AxisWeights } from './axisWeights';
import type { ExclusionStage, RecommendationResult, ScoredCandidate, SoftPenalty } from './types';

export const TRACE_VERSION = 1;

export const STAGE_LABELS: Record<ExclusionStage, string> = {
  verification: '검증 게이트(verified-only)',
  version: '배급 버전 확인',
  operating: '운영 상태',
  format_allowed: '허용 포맷',
  motion_seat: '움직이는 좌석 회피',
  time_window: '희망 시간대',
  travel: '이동 한도',
  price_cap: '가격 상한(레거시)',
  wheelchair: '휠체어 접근',
};

/** 하드 필터 적용 순서 — 엔진 hardFilterInner와 동일해야 한다. */
export const STAGE_ORDER: ExclusionStage[] = [
  'verification',
  'version',
  'operating',
  'format_allowed',
  'motion_seat',
  'time_window',
  'travel',
  'price_cap',
  'wheelchair',
];

export interface TraceFunnelStep {
  stage: ExclusionStage;
  label: string;
  removed: number;
  /** 이 단계까지 통과한 후보 수 */
  remaining: number;
}

export interface TraceCandidate {
  showtimeId: number;
  label: string; // "극장 관 · HH:MM (포맷)"
  format: string;
  priceAdult: number;
  travelMinutes?: number;
  rank?: number; // scored만
  final?: number;
  /** 사용자 노출 축과 같은 4축 점수(0~1) — screen_sound는 W1/W2/W3 합성과 동일 비율 */
  axisScores?: Record<(typeof AXIS_ORDER)[number], number>;
  softPenalties?: SoftPenalty[];
  excludedStage?: ExclusionStage;
  excludedReason?: string;
}

export interface RecommendationTrace {
  version: typeof TRACE_VERSION;
  policyVersion: string;
  generatedAt: string;
  dataState: 'verified' | 'synthetic' | 'none';
  totalCandidates: number;
  axisWeights: AxisWeights;
  funnel: TraceFunnelStep[];
  candidates: TraceCandidate[];
}

const timeFmt = new Intl.DateTimeFormat('ko-KR', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'Asia/Seoul',
});

const r3 = (x: number) => Number(x.toFixed(3));

function axisScoresOf(s: ScoredCandidate): TraceCandidate['axisScores'] {
  // toEngineWeights와 같은 내부 배분(45/35/20)으로 화면·음향 축 점수를 합성한다.
  return {
    screen_sound: r3(0.45 * s.axes.ffm + 0.35 * s.axes.audQ + 0.2 * s.axes.pm),
    seat: r3(s.axes.seatQ),
    travel: r3(s.axes.conv),
    price: r3(s.axes.pv),
  };
}

export function buildTrace(input: {
  result: RecommendationResult;
  policyVersion: string;
  generatedAt: string;
  dataState: RecommendationTrace['dataState'];
}): RecommendationTrace {
  const { result, policyVersion, generatedAt, dataState } = input;
  const req = result.request;

  const removedByStage = new Map<ExclusionStage, number>();
  for (const e of result.excluded) {
    if (e.stage) removedByStage.set(e.stage, (removedByStage.get(e.stage) ?? 0) + 1);
  }
  let remaining = result.totalCandidates;
  const funnel: TraceFunnelStep[] = STAGE_ORDER.map((stage) => {
    const removed = removedByStage.get(stage) ?? 0;
    remaining -= removed;
    return { stage, label: STAGE_LABELS[stage], removed, remaining };
  });

  const candLabel = (c: ScoredCandidate['candidate']) =>
    `${c.location.name} ${c.auditorium.no} · ${timeFmt.format(new Date(c.startsAt))} (${c.format})`;

  const candidates: TraceCandidate[] = [
    ...result.scored.map((s, i) => ({
      showtimeId: s.candidate.showtimeId,
      label: candLabel(s.candidate),
      format: s.candidate.format,
      priceAdult: s.candidate.priceAdult,
      travelMinutes: s.travelMinutes,
      rank: i + 1,
      final: r3(s.final),
      axisScores: axisScoresOf(s),
      softPenalties: s.softPenalties,
    })),
    ...result.excluded.map((e) => ({
      showtimeId: e.candidate.showtimeId,
      label: candLabel(e.candidate),
      format: e.candidate.format,
      priceAdult: e.candidate.priceAdult,
      excludedStage: e.stage,
      excludedReason: e.reason,
    })),
  ];

  return {
    version: TRACE_VERSION,
    policyVersion,
    generatedAt,
    dataState,
    totalCandidates: result.totalCandidates,
    axisWeights: axisWeights(req.priority, req.prioritySecondary ?? 'none'),
    funnel,
    candidates,
  };
}
