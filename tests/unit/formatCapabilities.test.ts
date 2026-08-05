// R21 §5 — format capability registry: 포맷명 비교가 아니라 capability로 회피를 판단한다.
// MX4D는 아직 운영 데이터에 없지만 registry 등록만으로 제외가 동작해야 한다(확장 검증).
import { describe, expect, it } from 'vitest';
import { recommend } from '../../src/domain/recommendation/engine';
import {
  capabilitiesOf,
  FORMAT_CAPABILITIES,
  hasMotionSeat,
} from '../../src/domain/recommendation/formatCapabilities';
import { makeCandidate, makeMovie, makeRequest, NOW, spec } from '../fixtures';

describe('formatCapabilities', () => {
  it('모션 시트 포맷은 4DX와 MX4D다', () => {
    expect(hasMotionSeat('4dx')).toBe(true);
    expect(hasMotionSeat('mx4d')).toBe(true);
    expect(hasMotionSeat('imax')).toBe(false);
    expect(hasMotionSeat('dolby_cinema')).toBe(false);
    expect(hasMotionSeat('standard')).toBe(false);
    expect(hasMotionSeat('superplex')).toBe(false);
  });

  it('등록되지 않은 포맷은 모든 capability가 보수적으로 false다', () => {
    expect(capabilitiesOf('unknown_format')).toEqual({
      motionSeat: false,
      extendedAspect: false,
      premium: false,
    });
  });

  it('FormatId 전체가 registry에 등록돼 있다', () => {
    for (const f of ['standard', 'superplex', 'imax', 'dolby_cinema', '4dx', 'mx4d'] as const) {
      expect(FORMAT_CAPABILITIES[f]).toBeDefined();
    }
  });
});

describe('움직이는 좌석 회피 — capability 기반 하드 제외', () => {
  const movie = makeMovie({ format_versions: spec(['standard', '4dx', 'mx4d']) });

  it.each(['4dx', 'mx4d'] as const)('%s 후보는 motionSickness=2에서 제외된다', (format) => {
    const r = recommend({
      movie,
      candidates: [makeCandidate({ format, price: 22_000 })],
      request: makeRequest({ maxPrice: Number.MAX_SAFE_INTEGER, motionSickness: 2 }),
      now: NOW,
    });
    expect(r.scored).toHaveLength(0);
    expect(r.excluded[0]?.reason).toContain('움직이는 좌석');
  });

  it('motionSickness=0이면 모션 시트 포맷도 후보로 남는다', () => {
    const r = recommend({
      movie,
      candidates: [makeCandidate({ format: 'mx4d', price: 22_000 })],
      request: makeRequest({ maxPrice: Number.MAX_SAFE_INTEGER, motionSickness: 0 }),
      now: NOW,
    });
    expect(r.scored).toHaveLength(1);
  });
});
