import { describe, expect, it } from 'vitest';
import { hardFilter, recommend, scoreCandidate } from '../../src/domain/recommendation/engine';
import { WEIGHT_PRESETS } from '../../src/domain/recommendation/presets';
import { makeCandidate, makeMovie, makeRequest, NOW, spec } from '../fixtures';

// 오펜하이머형: 1.43 확장비 + IMAX 촬영 + 애트모스 없음
const movie143 = () =>
  makeMovie({
    native_ar: spec('2.20'),
    imax_expanded_ar: spec('1.43'),
    filmed_for_imax: spec(true),
    atmos_mix: spec(false),
    genre_spectacle: spec(false, { infoStatus: 'user_report', confidence: 0.85 }),
    format_versions: spec(['imax', 'dolby_cinema', 'standard']),
  });

describe('FilmFormatMatch — 브랜드가 아니라 실제 표시 능력으로 점수화', () => {
  it('천호 CoLa 케이스: 1.43 콘텐츠를 1.90 지원 관에서 감점하고 단점으로 표기한다', () => {
    const movie = movie143();
    const req = makeRequest();
    const gt = scoreCandidate(movie, makeCandidate({ supportedAr: '1.43' }), req, NOW, 25_000);
    const cola = scoreCandidate(movie, makeCandidate({ supportedAr: '1.90' }), req, NOW, 25_000);

    expect(gt.axes.ffm).toBeGreaterThan(cola.axes.ffm);
    expect(gt.axes.ffm - cola.axes.ffm).toBeCloseTo(0.2, 5); // 화면비 표시 가능 항목만큼 차이
    expect(cola.cons.some((c) => c.includes('풀사이즈 상영 불가'))).toBe(true);
    expect(gt.pros.some((p) => p.includes('실제 표시 가능'))).toBe(true);
  });

  it('애트모스 미지원 영화는 돌비관에서 사운드 가산 없이 단점으로 표기한다', () => {
    const req = makeRequest();
    const noAtmos = scoreCandidate(
      movie143(),
      makeCandidate({ format: 'dolby_cinema', soundFormat: 'atmos' }),
      req,
      NOW,
      25_000,
    );
    const withAtmos = scoreCandidate(
      makeMovie({ ...movie143().specs, atmos_mix: spec(true) }),
      makeCandidate({ format: 'dolby_cinema', soundFormat: 'atmos' }),
      req,
      NOW,
      25_000,
    );

    expect(withAtmos.axes.ffm - noAtmos.axes.ffm).toBeCloseTo(0.25, 5);
    expect(noAtmos.cons.some((c) => c.includes('애트모스 믹스 없음'))).toBe(true);
  });

  it('포맷 적합도가 낮은 특별관은 설비 점수 절반 감점(브랜드 가산 차단)된다', () => {
    // 돌비 비전·애트모스·스펙터클 전무 → 돌비관 ffm 0.2 < 0.4
    const flatMovie = makeMovie({
      native_ar: spec('1.85'),
      format_versions: spec(['dolby_cinema', 'standard']),
    });
    const req = makeRequest();
    const s = scoreCandidate(
      flatMovie,
      makeCandidate({ format: 'dolby_cinema', soundFormat: 'atmos' }),
      req,
      NOW,
      25_000,
    );
    expect(s.axes.ffm).toBeLessThan(0.4);
    const W = WEIGHT_PRESETS[req.priority];
    const rawSum =
      s.quality + W.W5 * 0.5 + W.W6 * 0.5 + s.logistics; // personal은 중립 0.5 고정
    expect(s.base).toBeCloseTo(rawSum - 0.5 * W.W2 * s.axes.audQ, 5);
  });
});

describe('하드 필터 — 점수 상쇄 금지 (문서 05 §3)', () => {
  it('최대 이동 시간 초과 후보를 사유와 함께 제외한다', () => {
    const far = makeCandidate({ lat: 37.6203, lng: 127.2282 }); // 남양주 — 시청에서 약 35km
    const { passed, excluded } = hardFilter([far], makeRequest({ maxTravelMinutes: 60 }));
    expect(passed).toHaveLength(0);
    expect(excluded[0].reason).toContain('최대 이동 시간');
  });

  it('가격 상한 초과 후보를 사유와 함께 제외한다', () => {
    const { passed, excluded } = hardFilter(
      [makeCandidate({ price: 30_000 })],
      makeRequest({ maxPrice: 20_000 }),
    );
    expect(passed).toHaveLength(0);
    expect(excluded[0].reason).toContain('초과');
  });

  it('휠체어 필수 조건은 미확인 관도 점수 보상 없이 제외한다', () => {
    const { passed, excluded } = hardFilter(
      [makeCandidate(), makeCandidate({ format: 'standard' })],
      makeRequest({ wheelchair: true }),
    );
    expect(passed).toHaveLength(0);
    expect(excluded.every((e) => e.reason.includes('휠체어'))).toBe(true);
  });

  it('멀미 민감(2)이면 4DX를 제외한다', () => {
    const { passed, excluded } = hardFilter(
      [makeCandidate({ format: '4dx' })],
      makeRequest({ motionSickness: 2 }),
    );
    expect(passed).toHaveLength(0);
    expect(excluded[0].reason).toContain('4DX');
  });

  it('허용하지 않은 포맷을 제외한다', () => {
    const { passed, excluded } = hardFilter(
      [makeCandidate({ format: 'imax' })],
      makeRequest({ allowImax: false }),
    );
    expect(passed).toHaveLength(0);
    expect(excluded[0].reason).toContain('허용하지 않은 포맷');
  });
});

describe('신뢰도·최신성 보정', () => {
  it('신뢰도가 낮은 후보는 동일 조건에서 최종 점수가 내려간다', () => {
    const movie = movie143();
    const req = makeRequest();
    const trusted = scoreCandidate(movie, makeCandidate({ specConfidence: 0.85 }), req, NOW, 25_000);
    const shaky = scoreCandidate(
      movie,
      makeCandidate({ specConfidence: 0.25, specStatus: 'single_unverified' }),
      req,
      NOW,
      25_000,
    );
    expect(shaky.axes.dc).toBeLessThan(trusted.axes.dc);
    expect(shaky.final).toBeLessThan(trusted.final);
    expect(shaky.trust).toBeLessThan(trusted.trust);
  });
});

describe('다양성 선택과 배급 버전 필터', () => {
  it('결과가 균형·품질·근접·가성비 3유형의 서로 다른 회차로 나뉜다', () => {
    const movie = movie143();
    const candidates = [
      makeCandidate({ supportedAr: '1.43', price: 30_000 }), // 품질 우위
      makeCandidate({ supportedAr: '1.90', price: 25_000 }),
      makeCandidate({ format: 'standard', price: 14_000, lat: 37.5613, lng: 127.0374 }), // 가성비
    ];
    const result = recommend({ movie, candidates, request: makeRequest(), now: NOW });
    expect(result.picks.map((p) => p.label)).toEqual(['균형', '품질', '근접·가성비']);
    const ids = result.picks.map((p) => p.scored.candidate.showtimeId);
    expect(new Set(ids).size).toBe(3);
  });

  it('배급 버전에 없는 포맷 회차는 후보에서 제외한다 (4DX 버전 미확인)', () => {
    const movie = movie143(); // format_versions에 4dx 없음
    const result = recommend({
      movie,
      candidates: [makeCandidate({ format: '4dx' })],
      request: makeRequest(),
      now: NOW,
    });
    expect(result.scored).toHaveLength(0);
    expect(result.excluded[0].reason).toContain('배급 미확인');
  });
});
