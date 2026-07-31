import type { InputHTMLAttributes } from 'react';

/**
 * 선택형 비주얼 카드 — 설문지형 체크박스 나열 대신, 옵션 하나가 카드 하나로 보이는 토글.
 * Checkbox.tsx와 같은 원칙: 실제 <input type="checkbox">가 카드 전체를 덮는 투명 레이어라
 * 클릭·터치·키보드가 항상 네이티브 입력에 그대로 닿고, 폼 데이터 동작(미체크 시 필드 없음)도
 * 기존 체크박스와 동일하다. 선택 상태는 has-[:checked]로 카드 테두리·배경이 바뀌고,
 * 우상단 체크 배지가 나타난다.
 */
export function ToggleCard({
  title,
  description,
  ...inputProps
}: { title: string; description: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="relative flex min-h-[84px] cursor-pointer flex-col justify-center rounded-card-lg border border-border bg-surface p-4 pr-9 transition-all hover:border-border-strong has-[:checked]:border-primary-strong has-[:checked]:bg-primary-soft has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary-strong has-[:focus-visible]:ring-offset-2">
      <input type="checkbox" {...inputProps} className="peer absolute inset-0 h-full w-full cursor-pointer opacity-0" />
      {/* peer-checked는 형제 요소에만 적용되므로 내부 svg 대신 배지 자신의 text 색으로
          체크 표시를 제어한다(svg는 currentColor 상속). */}
      <span
        aria-hidden
        className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full border-2 border-border-strong bg-surface text-transparent opacity-70 transition-all peer-checked:border-primary-strong peer-checked:bg-primary-strong peer-checked:text-white peer-checked:opacity-100"
      >
        <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3">
          <path d="M3 8.2l3.2 3.2L13 4.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="text-[15px] font-semibold leading-snug text-text">{title}</span>
      <span className="mt-1 text-[13px] leading-snug text-text-sub">{description}</span>
    </label>
  );
}
