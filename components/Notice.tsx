import type { ReactNode } from 'react';
import { IconCheckCircle, IconWarning } from './Icon';

const TONE = {
  info: { cls: 'border-trust-mid/35 bg-trust-mid/10 text-trust-mid', Icon: IconWarning },
  success: { cls: 'border-trust-high/35 bg-trust-high/10 text-trust-high', Icon: IconCheckCircle },
} as const;

export function Notice({ tone = 'info', children }: { tone?: keyof typeof TONE; children: ReactNode }) {
  const t = TONE[tone];
  return (
    <div role="note" className={`flex items-start gap-2.5 rounded-card border ${t.cls} px-4 py-3 text-sm leading-relaxed`}>
      <t.Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <p className="m-0 text-text">{children}</p>
    </div>
  );
}
