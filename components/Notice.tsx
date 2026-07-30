import type { ReactNode } from 'react';
import { IconCheckCircle, IconWarning } from './Icon';

const TONE = {
  info: { cls: 'border-trust-mid/35 bg-trust-mid/10 text-trust-mid', Icon: IconWarning },
  success: { cls: 'border-trust-high/35 bg-trust-high/10 text-trust-high', Icon: IconCheckCircle },
} as const;

/**
 * detail을 주면 한 줄 요약(children)만 기본 노출하고, 나머지 설명은 "자세히" 뒤로 접는다 —
 * 결과 페이지 상단의 합성 데이터 경고가 첫 화면을 너무 많이 차지해 실제 추천이 늦게
 * 보인다는 피드백에서 나온 옵션이다.
 */
export function Notice({
  tone = 'info',
  children,
  detail,
}: {
  tone?: keyof typeof TONE;
  children: ReactNode;
  detail?: ReactNode;
}) {
  const t = TONE[tone];
  return (
    <div role="note" className={`flex items-start gap-2.5 rounded-card border ${t.cls} px-4 py-2.5 text-sm leading-relaxed`}>
      <t.Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="m-0 text-text">{children}</p>
        {detail ? (
          <details className="mt-1">
            <summary className="inline-flex min-h-6 cursor-pointer items-center text-[13px] font-medium text-text underline decoration-border underline-offset-2">
              자세히
            </summary>
            <div className="mt-1.5 text-[13px] text-text-sub">{detail}</div>
          </details>
        ) : null}
      </div>
    </div>
  );
}
