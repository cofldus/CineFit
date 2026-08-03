import type { InputHTMLAttributes, ReactNode } from 'react';

/**
 * 선택형 비주얼 카드 — 설문지형 컨트롤 나열 대신, 옵션 하나가 카드 하나로 보이는 선택지.
 * Checkbox.tsx와 같은 원칙: 실제 네이티브 입력이 카드 전체를 덮는 투명 레이어라 클릭·터치·
 * 키보드가 항상 입력에 그대로 닿고, 폼 데이터 동작도 기본 입력과 동일하다. 왼쪽 visual
 * 슬롯에 옵션의 의미를 보여주는 미니 일러스트(화면비 프레임·좌석 그리드 등 CineFit 시그니처
 * 그래픽)를 받는다. 미선택 상태는 장식 없는 차콜 서피스, 선택하면 옥스블러드 그라데이션 +
 * 얇은 와인 인셋 라인 + 와인 체크 배지가 스케일 인으로 나타나고 제목이 로즈로 물든다
 * (중첩 요소 상태 반영은 group-has 사용). 체크박스(ToggleCard)와 라디오(RadioCard)가
 * 같은 시각 언어를 공유한다.
 */
function SelectableCard({
  type,
  title,
  description,
  visual,
  ...inputProps
}: {
  type: 'checkbox' | 'radio';
  title: string;
  description: string;
  visual?: ReactNode;
} & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="group relative flex min-h-[88px] cursor-pointer items-center overflow-hidden rounded-card-lg bg-surface-raised p-4 pr-10 transition-all duration-200 hover:-translate-y-0.5 hover:bg-surface-strong has-[:checked]:bg-[linear-gradient(135deg,rgba(93,24,40,0.4),rgba(36,28,31,0.95)_65%)] has-[:checked]:shadow-[inset_0_0_0_1px_rgba(188,96,118,0.5)] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary has-[:focus-visible]:ring-offset-2">
      <input type={type} {...inputProps} className="peer absolute inset-0 h-full w-full cursor-pointer opacity-0" />
      {/* 체크 배지 — 미선택 시 완전히 숨겨져 있다가 선택 시 스케일 인. */}
      <span
        aria-hidden
        className="absolute right-3.5 top-1/2 flex h-[22px] w-[22px] -translate-y-1/2 scale-75 items-center justify-center rounded-full bg-primary-strong text-white opacity-0 transition-all duration-200 group-has-[:checked]:scale-100 group-has-[:checked]:opacity-100"
      >
        <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3">
          <path d="M3 8.2l3.2 3.2L13 4.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      {visual ? (
        <span
          aria-hidden
          className="mr-3.5 flex h-12 w-14 shrink-0 items-center justify-center opacity-75 transition-opacity group-has-[:checked]:opacity-100"
        >
          {visual}
        </span>
      ) : null}
      <span className="flex min-w-0 flex-col">
        <span className="break-keep text-[15px] font-semibold leading-snug text-text transition-colors group-has-[:checked]:text-primary">
          {title}
        </span>
        <span className="mt-1 break-keep text-[13px] leading-snug text-text-sub">{description}</span>
      </span>
    </label>
  );
}

type CardProps = { title: string; description: string; visual?: ReactNode } & Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type'
>;

export function ToggleCard(props: CardProps) {
  return <SelectableCard type="checkbox" {...props} />;
}

export function RadioCard(props: CardProps) {
  return <SelectableCard type="radio" {...props} />;
}
