import { INFO_STATUS_LABELS } from '../src/domain/recommendation/presets';
import type { InfoStatus } from '../src/domain/recommendation/types';

// R14 §4: 확인 상태의 핵심은 색이 아니라 아이콘·문구·확인 날짜다. 배지 테두리·라벨은
// 중성으로 통일하고, 의미색은 아이콘 하나에만 남긴다(확인 계열은 저채도 steel — 초록 금지).
const TIER: Record<InfoStatus, { iconCls: string; icon: string }> = {
  official: { iconCls: 'text-trust-high', icon: '✓' },
  multi_source: { iconCls: 'text-trust-high', icon: '✓' },
  user_report: { iconCls: 'text-trust-mid', icon: '◑' },
  single_unverified: { iconCls: 'text-trust-mid', icon: '◔' },
  estimated: { iconCls: 'text-trust-mid', icon: '≈' },
  rumor: { iconCls: 'text-trust-low', icon: '?' },
  outdated: { iconCls: 'text-trust-low', icon: '⏳' },
  conflict: { iconCls: 'text-trust-low', icon: '⚠' },
};

export function TrustBadge({ status, observedAt }: { status: InfoStatus; observedAt?: string }) {
  const t = TIER[status];
  const label = INFO_STATUS_LABELS[status] ?? status;
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-border-strong px-2.5 py-0.5 text-xs font-medium text-text-sub">
      <span aria-hidden className={t.iconCls}>
        {t.icon}
      </span>
      {label}
      {observedAt ? <span className="text-text-tertiary">· {observedAt.slice(0, 10)}</span> : null}
    </span>
  );
}
