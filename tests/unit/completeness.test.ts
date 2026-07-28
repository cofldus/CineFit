import { describe, expect, it } from 'vitest';
import {
  computeAuditoriumCompleteness,
  summarizeByLevel,
  summarizeByRegion,
  type AuditoriumCompletenessInput,
} from '../../src/domain/dataQuality/completeness';

const NOW = new Date('2026-07-27T00:00:00+09:00');

function full(overrides: Partial<AuditoriumCompletenessInput> = {}): AuditoriumCompletenessInput {
  return {
    hasCurrentSpec: true,
    hasProjector: true,
    hasScreen: true,
    hasSound: true,
    hasSupportedAr: true,
    hasSeatZone: true,
    hasSource: true,
    hasActiveShowtime: true,
    specObservedAt: '2026-07-01T00:00:00Z',
    now: NOW,
    ...overrides,
  };
}

describe('상영관 데이터 완성도 채점', () => {
  it('모든 항목이 채워지면 Complete다', () => {
    expect(computeAuditoriumCompleteness(full()).level).toBe('Complete');
  });

  it('사양 자체가 없으면 Insufficient다 (다른 항목과 무관)', () => {
    const result = computeAuditoriumCompleteness(
      full({ hasCurrentSpec: false, hasProjector: false, hasScreen: false, specObservedAt: null }),
    );
    expect(result.level).toBe('Insufficient');
  });

  it('사양은 오래되었지만(180일 초과) 다른 항목은 다 있으면 Stale이 Complete보다 우선한다', () => {
    const result = computeAuditoriumCompleteness(full({ specObservedAt: '2025-01-01T00:00:00Z' }));
    expect(result.level).toBe('Stale');
  });

  it('신선한 사양이지만 절반 정도만 채워지면 Partial 또는 Usable이다', () => {
    const result = computeAuditoriumCompleteness(
      full({ hasProjector: false, hasSound: false, hasSupportedAr: false, hasSeatZone: false }),
    );
    expect(['Partial', 'Usable']).toContain(result.level);
    expect(result.missing).toEqual(expect.arrayContaining(['영사기', '사운드', '표시 가능 화면비', '좌석 존']));
  });

  it('누락 항목이 거의 다면 Insufficient다', () => {
    const result = computeAuditoriumCompleteness(
      full({ hasProjector: false, hasScreen: false, hasSound: false, hasSupportedAr: false, hasSeatZone: false, hasSource: false }),
    );
    expect(result.level).toBe('Insufficient');
  });

  it('접근성은 채점 대상이 아니다 — 입력 타입에 해당 필드가 없다', () => {
    const input = full();
    expect('hasAccessibility' in input).toBe(false);
  });
});

describe('완성도 집계', () => {
  it('레벨별 개수를 센다', () => {
    const rows = [{ level: 'Complete' as const }, { level: 'Complete' as const }, { level: 'Stale' as const }];
    const counts = summarizeByLevel(rows);
    expect(counts.Complete).toBe(2);
    expect(counts.Stale).toBe(1);
    expect(counts.Usable).toBe(0);
  });

  it('지역별로 묶는다 — regionCode가 없으면 미상으로 묶인다', () => {
    const rows = [
      { level: 'Complete' as const, regionCode: 'seoul' },
      { level: 'Insufficient' as const, regionCode: 'seoul' },
      { level: 'Usable' as const, regionCode: null },
    ];
    const breakdown = summarizeByRegion(rows);
    const seoul = breakdown.find((b) => b.regionCode === 'seoul');
    const unknown = breakdown.find((b) => b.regionCode === '미상');
    expect(seoul?.total).toBe(2);
    expect(unknown?.total).toBe(1);
  });
});
