import type { ReactNode } from 'react';

// 근거·이력·개별 사양 배지 등 "왜 이 정보가 표시되나요?" 뒤로 숨길 내용을 감싸는 공용 disclosure
// (§10·§14 — 기본 화면에는 요약만, 원본 필드명·enum·가중치 숫자는 펼쳐야 보인다).
export function TrustDetails({
  summaryLabel = '왜 이 정보가 표시되나요?',
  className = '',
  children,
}: {
  summaryLabel?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <details className={`mt-2 ${className}`}>
      <summary className="min-h-11 cursor-pointer list-none text-xs font-medium text-ed-ink-muted underline decoration-dotted underline-offset-4 [&::-webkit-details-marker]:hidden">
        {summaryLabel}
      </summary>
      <div className="mt-2">{children}</div>
    </details>
  );
}
