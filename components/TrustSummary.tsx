import { VERIFIED_STATUSES } from '../src/domain/recommendation/presets';
import type { InfoStatus } from '../src/domain/recommendation/types';

const LOW_STATUSES = new Set(['rumor', 'outdated', 'conflict']);

function aggregate(statuses: InfoStatus[]): { label: string; tone: 'high' | 'mid' | 'low' } {
  if (statuses.length === 0) return { label: '정보 없음', tone: 'mid' };
  if (statuses.some((s) => LOW_STATUSES.has(s))) return { label: '확인이 더 필요해요', tone: 'low' };
  if (statuses.every((s) => VERIFIED_STATUSES.has(s))) return { label: '출처 확인 완료', tone: 'high' };
  return { label: '일부 정보 미확인', tone: 'mid' };
}

const TONE_CLS: Record<'high' | 'mid' | 'low', string> = {
  high: 'text-trust-high',
  mid: 'text-trust-mid',
  low: 'text-trust-low',
};

/** 개별 사양 배지 대신 한 줄 요약만 기본으로 보여준다 — 상세는 TrustDetails 뒤로(§7·§14). */
export function TrustSummary({ statuses }: { statuses: InfoStatus[] }) {
  const { label, tone } = aggregate(statuses);
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${TONE_CLS[tone]}`}>
      <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
      {label}
    </span>
  );
}
