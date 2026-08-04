// R20 §10 — 제품 로직 안정화 시나리오 테스트 (엔진·완화 제안·데이터 상태).
import { describe, expect, it } from 'vitest';
import { axisWeights, toEngineWeights } from '../../src/domain/recommendation/axisWeights';
import { recommend } from '../../src/domain/recommendation/engine';
import { suggestRelaxations } from '../../src/domain/recommendation/relaxation';
import { deriveCandidateDataState, isStale, latestCheckedAt } from '../../src/lib/dataFreshness';
import { makeCandidate, makeMovie, makeRequest, NOW, spec } from '../fixtures';

const movie = makeMovie({
  format_versions: spec(['standard', 'imax', '4dx']),
  imax_expanded_ar: spec('1.90'),
  filmed_for_imax: spec(true),
  genre_spectacle: spec(true),
});

describe('시나리오 1 — 오늘/저녁/서울시청/45분 · 화면·음향 1순위 · +5천 원 · 움직이는 좌석 제외', () => {
  const eveningImax = makeCandidate({ format: 'imax', price: 28_000 }); // 기준(20,000) 초과 → 감점만
  const eveningStandard = makeCandidate({ format: 'standard', price: 15_000 });
  const morningStandard = makeCandidate({ format: 'standard', price: 15_000, startsAt: '2026-07-28T10:30:00+09:00' });
  const farStandard = makeCandidate({ format: 'standard', price: 15_000, lat: 37.65, lng: 127.12 }); // 이동 45분 초과
  const evening4dx = makeCandidate({ format: '4dx', price: 22_000 });

  const result = recommend({
    movie,
    candidates: [eveningImax, eveningStandard, morningStandard, farStandard, evening4dx],
    request: makeRequest({
      timeWindow: 'evening',
      maxTravelMinutes: 45,
      priority: 'quality',
      maxPrice: Number.MAX_SAFE_INTEGER,
      priceRef: 20_000, // 일반관 최저 15,000 + 5,000
      motionSickness: 2, // 움직이는 좌석 회피
    }),
    now: NOW,
    weightsOverride: toEngineWeights(axisWeights('quality', 'none')),
  });

  it('시간 조건을 벗어난 후보는 제외된다', () => {
    const r = result.excluded.find((e) => e.candidate.showtimeId === morningStandard.showtimeId);
    expect(r?.reason).toContain('희망 시간대');
  });

  it('이동 조건을 벗어난 후보는 제외된다', () => {
    const r = result.excluded.find((e) => e.candidate.showtimeId === farStandard.showtimeId);
    expect(r?.reason).toContain('최대 이동 시간');
  });

  it('움직이는 좌석(4DX) 후보는 제외된다', () => {
    const r = result.excluded.find((e) => e.candidate.showtimeId === evening4dx.showtimeId);
    expect(r?.reason).toContain('움직이는 좌석');
  });

  it('가격 차이는 soft penalty — 기준 초과 IMAX는 제외되지 않고 감점 사유만 남는다', () => {
    const s = result.scored.find((x) => x.candidate.showtimeId === eveningImax.showtimeId);
    expect(s).toBeDefined();
    expect(s!.cons.join(' ')).toContain('감점');
  });

  it('화면·음향 1순위 — 사양이 확인된 IMAX 후보가 1위다', () => {
    expect(result.picks[0]?.scored.candidate.showtimeId).toBe(eveningImax.showtimeId);
  });
});

describe('시나리오 2 — 매우 좁은 시간대 + 30분 이동 한도 → 후보 0 + 완화 제안', () => {
  const evening = makeCandidate({ format: 'standard', price: 15_000 }); // 19:00 시작, 이동 ~26분
  const request = makeRequest({
    timeWindow: 'custom',
    timeFrom: '13:00',
    timeTo: '13:30',
    maxTravelMinutes: 30,
    maxPrice: Number.MAX_SAFE_INTEGER,
  });
  const base = recommend({ movie, candidates: [evening], request, now: NOW });

  it('후보가 0개다', () => {
    expect(base.scored).toHaveLength(0);
  });

  it('시간대 완화 제안이 실측 추가 개수와 함께 나온다', () => {
    const suggestions = suggestRelaxations({
      movie,
      candidates: [evening],
      request,
      now: NOW,
      baseCount: 0,
    });
    const time = suggestions.find((s) => s.key === 'time');
    expect(time).toBeDefined();
    expect(time!.added).toBe(1);
    // 이동 한도는 원인이 아니므로(26분 < 30분) 완화해도 늘지 않아 제안되지 않는다.
    expect(suggestions.find((s) => s.key === 'travel')).toBeUndefined();
  });
});

describe('시나리오 3 — 실제 회차 데이터 미연결 상태 판정', () => {
  it('합성(테스트) 후보만 있으면 synthetic — 화면은 개수 대신 안내 문구를 보여야 한다', () => {
    expect(deriveCandidateDataState({ total: 3, usedSynthetic: true })).toBe('synthetic');
  });

  it('후보가 아예 없으면 none', () => {
    expect(deriveCandidateDataState({ total: 0, usedSynthetic: false })).toBe('none');
  });

  it('관리자 확인 회차면 verified', () => {
    expect(deriveCandidateDataState({ total: 2, usedSynthetic: false })).toBe('verified');
  });
});

describe('데이터 신선도(stale)', () => {
  it('확인 7일 초과면 stale', () => {
    expect(isStale('2026-07-27T12:00:00+09:00', new Date('2026-08-04T12:00:01+09:00'))).toBe(true);
    expect(isStale('2026-07-27T12:00:00+09:00', new Date('2026-07-30T12:00:00+09:00'))).toBe(false);
  });

  it('latestCheckedAt은 verifiedAt 우선, 최신값을 고른다', () => {
    expect(
      latestCheckedAt([
        { verifiedAt: '2026-07-20T10:00:00+09:00', dataCheckedAt: '2026-07-01T10:00:00+09:00' },
        { verifiedAt: null, dataCheckedAt: '2026-07-25T10:00:00+09:00' },
      ]),
    ).toBe('2026-07-25T10:00:00+09:00');
  });
});

describe('큰 화면 멀미 — soft 감점(제외 아님)', () => {
  it('IMAX 후보가 제외되지 않고 화면 축 점수만 낮아진다', () => {
    const imax = makeCandidate({ format: 'imax', price: 25_000 });
    const withAvoid = recommend({
      movie,
      candidates: [imax],
      request: makeRequest({ maxPrice: Number.MAX_SAFE_INTEGER, avoidBigScreen: true }),
      now: NOW,
    });
    const without = recommend({
      movie,
      candidates: [makeCandidate({ format: 'imax', price: 25_000 })],
      request: makeRequest({ maxPrice: Number.MAX_SAFE_INTEGER }),
      now: NOW,
    });
    expect(withAvoid.scored).toHaveLength(1);
    expect(withAvoid.scored[0].axes.ffm).toBeLessThan(without.scored[0].axes.ffm);
  });
});
