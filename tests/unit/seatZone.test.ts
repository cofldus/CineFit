import { describe, expect, it } from 'vitest';
import { scoreCandidate } from '../../src/domain/recommendation/engine';
import { desiredPurposes, suggestSeatZone } from '../../src/domain/recommendation/seatZone';
import type { SeatZone } from '../../src/domain/recommendation/types';
import { makeCandidate, makeMovie, makeRequest, NOW, spec } from '../fixtures';

const zone = (purposes: string[], overrides: Partial<SeatZone> = {}): SeatZone => ({
  purposes,
  rowRange: 'J~L열',
  colRange: '중앙 블록',
  rationale: '커뮤니티 복수 일치 명당',
  infoStatus: 'user_report',
  observedAt: '2026-06-15',
  confidence: 0.7,
  sourceName: '익스트림무비',
  ...overrides,
});

const movie = () =>
  makeMovie({
    imax_expanded_ar: spec('1.90'),
    filmed_for_imax: spec(true),
    format_versions: spec(['imax', 'standard']),
  });

describe('원하는 좌석 목적 도출', () => {
  it('포맷·선호에 따라 목적이 달라진다', () => {
    expect(desiredPurposes('imax', makeRequest())).toEqual(['immersive']);
    expect(desiredPurposes('superplex', makeRequest())).toEqual(['overview']);
    expect(desiredPurposes('4dx', makeRequest({ motionSickness: 1 }))).toEqual(['low_motion']);
    expect(
      desiredPurposes('imax', makeRequest({ subtitleReadability: true, neckComfort: true })),
    ).toEqual(['immersive', 'subtitle', 'neck_easy']);
  });
});

describe('좌석 존 추천', () => {
  it('DB 존이 목적과 맞으면 구역·근거·출처를 사용한다', () => {
    const s = suggestSeatZone('imax', null, makeRequest(), [zone(['immersive', 'sound'])]);
    expect(s.zone).toBe('J~L열 중앙 블록');
    expect(s.rationale.join(' ')).toContain('익스트림무비');
    expect(s.label).toBe('추정');
  });

  it('맞는 존이 없으면 휴리스틱으로 폴백하고 그 사실을 명시한다', () => {
    const s = suggestSeatZone('imax', null, makeRequest({ neckComfort: true }), [zone(['exit_easy'])]);
    expect(s.zone).toBe('후방 중앙');
    expect(s.rationale[0]).toContain('제보 없음');
  });

  it('일부 목적이 미충족이면 미확인 목적을 표기한다', () => {
    const s = suggestSeatZone('imax', null, makeRequest({ neckComfort: true }), [zone(['immersive'])]);
    expect(s.rationale.join(' ')).toContain('미확인 목적: neck_easy');
  });
});

describe('SeatQuality 축 (문서 05 §4.4)', () => {
  it('목적이 커버되는 존이 있으면 좌석 점수가 중립 0.5보다 높다', () => {
    const req = makeRequest();
    const withZone = scoreCandidate(
      movie(),
      makeCandidate({ supportedAr: '1.90', seatZones: [zone(['immersive'])] }),
      req,
      NOW,
      25_000,
    );
    const without = scoreCandidate(movie(), makeCandidate({ supportedAr: '1.90' }), req, NOW, 25_000);
    expect(withZone.axes.seatQ).toBeCloseTo(0.5 + 0.35 * 0.7, 5);
    expect(without.axes.seatQ).toBe(0.5);
    expect(withZone.final).toBeGreaterThan(without.final * 0.98); // W4 반영 (신뢰 보정 상쇄 감안)
    expect(withZone.citations.some((c) => c.what.startsWith('좌석 존'))).toBe(true);
    expect(without.uncertainties.join(' ')).toContain('좌석 존 데이터 없음');
  });

  it('목적 절반만 커버되면 부분 점수를 받는다', () => {
    const req = makeRequest({ neckComfort: true }); // desired: immersive + neck_easy
    const s = scoreCandidate(
      movie(),
      makeCandidate({ supportedAr: '1.90', seatZones: [zone(['immersive'])] }),
      req,
      NOW,
      25_000,
    );
    expect(s.axes.seatQ).toBeCloseTo(0.5 + 0.35 * (1 / 2) * 0.7, 5);
  });
});
