import type { ReactNode } from 'react';
import { IconCheckCircle, IconWarning } from './Icon';

// 테두리 없는 컴팩트 안내 줄 — 이전의 진한 경고 박스(테두리+톤 배경)가 추천보다 강하게
// 보인다는 피드백. 배경만 아주 옅게, 테두리 없이, 한두 줄 이내로 줄였다.
const TONE = {
  info: { cls: 'bg-warning-bg text-warning-text', Icon: IconWarning },
  success: { cls: 'bg-trust-high/10 text-trust-high', Icon: IconCheckCircle },
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
    <div role="note" className={`flex items-start gap-2 rounded-[10px] ${t.cls} px-3.5 py-2 text-[13.5px] leading-relaxed`}>
      <t.Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="m-0">{children}</p>
        {detail ? (
          <details className="mt-1">
            <summary className="inline-flex min-h-6 cursor-pointer items-center text-[12.5px] font-medium hover:underline decoration-current/40 underline-offset-2">
              자세히
            </summary>
            <div className="mt-1.5 text-[12.5px] opacity-80">{detail}</div>
          </details>
        ) : null}
      </div>
    </div>
  );
}
