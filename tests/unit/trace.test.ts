// R21 §3 — recommendation trace: 퍼널 전후 카운트·후보별 제외 사유·4축 점수·soft
// penalty·순위가 엔진 결과에서 정확히 재구성되는지.
import { describe, expect, it } from 'vitest';
import { recommend } from '../../src/domain/recommendation/engine';
import { buildTrace } from '../../src/domain/recommendation/trace';
import { makeCandidate, makeMovie, makeRequest, NOW, spec } from '../fixtures';

const movie = makeMovie({
  format_versions: spec(['standard', 'imax']),
  imax_expanded_ar: spec('1.90'),
});

describe('buildTrace', () => {
  const near = makeCandidate({ format: 'imax', price: 28_000 });
  const far = makeCandidate({ format: 'standard', price: 15_000, lat: 37.65, lng: 127.12 }); // 이동 초과
  const morning = makeCandidate({ format: 'standard', price: 15_000, startsAt: '2026-07-28T10:00:00+09:00' });
  const unknownVersion = makeCandidate({ format: '4dx', price: 22_000 }); // 배급 버전에 없음

  const result = recommend({
    movie,
    candidates: [near, far, morning, unknownVersion],
    request: makeRequest({
      timeWindow: 'evening',
      maxTravelMinutes: 45,
      maxPrice: Number.MAX_SAFE_INTEGER,
      priceRef: 20_000,
      priority: 'quality',
      prioritySecondary: 'seat',
    }),
    now: NOW,
  });
  const trace = buildTrace({
    result,
    policyVersion: 'v3-axis100',
    generatedAt: NOW.toISOString(),
    dataState: 'synthetic',
  });

  it('하드 필터 퍼널의 전후 카운트가 제외 결과와 일치한다', () => {
    expect(trace.totalCandidates).toBe(4);
    const byStage = Object.fromEntries(trace.funnel.map((f) => [f.stage, f]));
    expect(byStage.version.removed).toBe(1); // 4dx 버전 미확인
    expect(byStage.time_window.removed).toBe(1); // 오전 회차
    expect(byStage.travel.removed).toBe(1); // 이동 초과
    expect(trace.funnel[trace.funnel.length - 1].remaining).toBe(result.scored.length);
  });

  it('제외 후보에 stage·사유가, 통과 후보에 순위·4축 점수가 붙는다', () => {
    const excluded = trace.candidates.filter((c) => c.excludedReason);
    expect(excluded).toHaveLength(3);
    expect(excluded.every((c) => c.excludedStage)).toBe(true);
    const ranked = trace.candidates.filter((c) => typeof c.rank === 'number');
    expect(ranked).toHaveLength(result.scored.length);
    expect(ranked[0].rank).toBe(1);
    for (const c of ranked) {
      for (const axis of ['screen_sound', 'seat', 'travel', 'price'] as const) {
        expect(c.axisScores![axis]).toBeGreaterThanOrEqual(0);
        expect(c.axisScores![axis]).toBeLessThanOrEqual(1);
      }
    }
  });

  it('soft penalty(가격 기준 초과)가 trace에 남는다', () => {
    const imaxTraced = trace.candidates.find((c) => c.showtimeId === near.showtimeId);
    expect(imaxTraced?.softPenalties?.some((p) => p.type === 'price_over_ref')).toBe(true);
  });

  it('가중치는 4축 정수(합 100)로 기록된다', () => {
    const sum = Object.values(trace.axisWeights).reduce((a, b) => a + b, 0);
    expect(sum).toBe(100);
    expect(trace.axisWeights.screen_sound).toBe(43); // quality + seat 2순위
  });
});
