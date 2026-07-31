import type { ReactNode } from 'react';

// 폼을 카드 여러 개를 쌓아 올린 모습 대신, 번호 매긴 스텝을 구분선으로만 나누는 한 흐름으로
// 보여준다(docs 6개 폼 공통 원칙 — "긴 세로 카드 스택 금지, 명확한 스텝 구조").
export function StepSection({
  step,
  title,
  children,
  first = false,
}: {
  step: number;
  title: string;
  children: ReactNode;
  first?: boolean;
}) {
  return (
    <section className={first ? 'pt-0' : 'mt-6 border-t border-border pt-6'}>
      <h2 className="font-wanted m-0 mb-4 flex items-center gap-2.5 text-base font-bold tracking-[-0.01em] text-text">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-strong text-xs font-bold text-white">
          {step}
        </span>
        {title}
      </h2>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}
