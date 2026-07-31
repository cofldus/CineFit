import type { InputHTMLAttributes } from 'react';

/** 접근성을 유지한 커스텀 체크박스 — 네이티브 accent-color 틴트만 입힌 기본 체크박스
    대신 완전히 커스텀한 시각을 쓴다. 실제 <input type="checkbox">는 sr-only(클릭 불가능한
    0크기 클립)가 아니라 박스 전체를 덮는 투명(opacity-0) 레이어로 둬서, 마우스·터치·
    Playwright 등 실제 클릭이 항상 입력 자체에 그대로 닿는다 — 체크 아이콘은 static 흐름이라
    absolute인 입력보다 항상 아래에 쌓여 클릭을 가로채지 않는다. */
export function Checkbox(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <span className="relative flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] border-2 border-border-strong bg-surface transition-colors has-[:checked]:border-primary-strong has-[:checked]:bg-primary-strong has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-surface">
      <input type="checkbox" {...props} className="peer absolute inset-0 h-full w-full cursor-pointer opacity-0" />
      <svg
        aria-hidden
        viewBox="0 0 16 16"
        fill="none"
        className="pointer-events-none h-3 w-3 text-white opacity-0 transition-opacity peer-checked:opacity-100"
      >
        <path d="M3 8.2l3.2 3.2L13 4.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}
