import { INFO_STATUS_LABELS } from '../src/domain/recommendation/presets';
import type { InfoStatus } from '../src/domain/recommendation/types';

// 색+아이콘+텍스트 병기 — 색 단독으로 상태를 구분하지 않음 (docs/09 §3·§5)
const TIER: Record<InfoStatus, { cls: string; icon: string }> = {
  official: { cls: 'border-trust-high/40 text-trust-high', icon: '✔' },
  multi_source: { cls: 'border-trust-high/40 text-trust-high', icon: '✔' },
  user_report: { cls: 'border-trust-mid/40 text-trust-mid', icon: '◑' },
  single_unverified: { cls: 'border-trust-mid/40 text-trust-mid', icon: '◔' },
  estimated: { cls: 'border-trust-mid/40 text-trust-mid', icon: '≈' },
  rumor: { cls: 'border-trust-low/40 text-trust-low', icon: '?' },
  outdated: { cls: 'border-trust-low/40 text-trust-low', icon: '⏳' },
  conflict: { cls: 'border-trust-low/40 text-trust-low', icon: '⚠' },
};

export function TrustBadge({ status, observedAt }: { status: InfoStatus; observedAt?: string }) {
  const t = TIER[status];
  const label = INFO_STATUS_LABELS[status] ?? status;
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium ${t.cls}`}
    >
      <span aria-hidden>{t.icon}</span>
      {label}
      {observedAt ? <span className="text-text-sub">· {observedAt.slice(0, 10)}</span> : null}
    </span>
  );
}
