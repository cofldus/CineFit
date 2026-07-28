// 상영관 데이터 완성도 — 섹션 19. "접근성" 항목은 현재 스키마 어디에도 필드가 없어(알려진
// 데이터 한계, docs/BETA-LIMITATIONS.md) 점수 계산에서 제외한다 — 있지도 않은 필드를 있는
// 것처럼 채점하지 않는다.
const STALE_SPEC_DAYS = 180; // docs/DEVELOPMENT.md "상영관 장비: 180일"과 동일 기준

export type CompletenessLevel = 'Complete' | 'Usable' | 'Partial' | 'Insufficient' | 'Stale';

export interface AuditoriumCompletenessInput {
  hasCurrentSpec: boolean;
  hasProjector: boolean;
  hasScreen: boolean;
  hasSound: boolean;
  hasSupportedAr: boolean;
  hasSeatZone: boolean;
  hasSource: boolean;
  hasActiveShowtime: boolean;
  specObservedAt: string | null;
  now: Date;
}

export interface CompletenessResult {
  level: CompletenessLevel;
  score: number; // 0~1 — 통과한 항목 비율(참고용, 사용자에게 그대로 노출하지 않는다)
  missing: string[];
}

const CHECKS: { key: keyof AuditoriumCompletenessInput; label: string }[] = [
  { key: 'hasCurrentSpec', label: '현재 사양' },
  { key: 'hasProjector', label: '영사기' },
  { key: 'hasScreen', label: '스크린' },
  { key: 'hasSound', label: '사운드' },
  { key: 'hasSupportedAr', label: '표시 가능 화면비' },
  { key: 'hasSeatZone', label: '좌석 존' },
  { key: 'hasSource', label: '출처' },
  { key: 'hasActiveShowtime', label: '활성 회차' },
];

function daysSince(iso: string, now: Date): number {
  return (now.getTime() - new Date(iso).getTime()) / 86_400_000;
}

export function computeAuditoriumCompleteness(input: AuditoriumCompletenessInput): CompletenessResult {
  const missing = CHECKS.filter((c) => !input[c.key]).map((c) => c.label);
  const score = (CHECKS.length - missing.length) / CHECKS.length;

  if (input.hasCurrentSpec && input.specObservedAt && daysSince(input.specObservedAt, input.now) > STALE_SPEC_DAYS) {
    return { level: 'Stale', score, missing };
  }
  if (!input.hasCurrentSpec) return { level: 'Insufficient', score, missing };
  if (score >= 0.99) return { level: 'Complete', score, missing };
  if (score >= 0.75) return { level: 'Usable', score, missing };
  if (score >= 0.4) return { level: 'Partial', score, missing };
  return { level: 'Insufficient', score, missing };
}

export const COMPLETENESS_LEVELS: CompletenessLevel[] = ['Complete', 'Usable', 'Partial', 'Insufficient', 'Stale'];

export const COMPLETENESS_LEVEL_LABELS: Record<CompletenessLevel, string> = {
  Complete: '완전',
  Usable: '사용 가능',
  Partial: '부분적',
  Insufficient: '불충분',
  Stale: '오래됨',
};

function emptyLevelCounts(): Record<CompletenessLevel, number> {
  return { Complete: 0, Usable: 0, Partial: 0, Insufficient: 0, Stale: 0 };
}

export function summarizeByLevel(rows: { level: CompletenessLevel }[]): Record<CompletenessLevel, number> {
  const counts = emptyLevelCounts();
  for (const r of rows) counts[r.level] += 1;
  return counts;
}

export interface RegionalCompletenessBreakdown {
  regionCode: string;
  total: number;
  byLevel: Record<CompletenessLevel, number>;
}

export function summarizeByRegion(
  rows: { level: CompletenessLevel; regionCode: string | null }[],
): RegionalCompletenessBreakdown[] {
  const map = new Map<string, RegionalCompletenessBreakdown>();
  for (const r of rows) {
    const region = r.regionCode ?? '미상';
    let entry = map.get(region);
    if (!entry) {
      entry = { regionCode: region, total: 0, byLevel: emptyLevelCounts() };
      map.set(region, entry);
    }
    entry.total += 1;
    entry.byLevel[r.level] += 1;
  }
  return [...map.values()].sort((a, b) => b.total - a.total);
}
