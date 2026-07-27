import type { ReactNode } from 'react';

const TONE = {
  info: { cls: 'border-trust-mid/35 bg-trust-mid/10', icon: '⚠️' },
  success: { cls: 'border-trust-high/35 bg-trust-high/10', icon: '✔' },
} as const;

export function Notice({ tone = 'info', children }: { tone?: keyof typeof TONE; children: ReactNode }) {
  const t = TONE[tone];
  return (
    <div role="note" className={`flex items-start gap-2.5 rounded-card border ${t.cls} px-4 py-3 text-sm leading-relaxed text-text`}>
      <span aria-hidden className="mt-0.5">
        {t.icon}
      </span>
      <p className="m-0">{children}</p>
    </div>
  );
}
