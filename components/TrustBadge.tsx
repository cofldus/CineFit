import { INFO_STATUS_LABELS } from '../src/domain/recommendation/presets';
import type { InfoStatus } from '../src/domain/recommendation/types';

// 색+아이콘+텍스트 병기 — 색 단독으로 상태를 구분하지 않음 (docs/09 §3·§5)
const TIER: Record<InfoStatus, { cls: string; icon: string }> = {
  official: { cls: 'badge-high', icon: '✔' },
  multi_source: { cls: 'badge-high', icon: '✔' },
  user_report: { cls: 'badge-mid', icon: '◑' },
  single_unverified: { cls: 'badge-mid', icon: '◔' },
  estimated: { cls: 'badge-mid', icon: '≈' },
  rumor: { cls: 'badge-low', icon: '?' },
  outdated: { cls: 'badge-low', icon: '⏳' },
  conflict: { cls: 'badge-low', icon: '⚠' },
};

export function TrustBadge({ status, observedAt }: { status: InfoStatus; observedAt?: string }) {
  const t = TIER[status];
  const label = INFO_STATUS_LABELS[status] ?? status;
  return (
    <span className={`badge ${t.cls}`}>
      <span aria-hidden>{t.icon}</span>
      {label}
      {observedAt ? <span className="sub">· {observedAt.slice(0, 10)}</span> : null}
    </span>
  );
}
