import type { SVGProps } from 'react';

// 자체 SVG 아이콘 — 이모지 픽토그램 대체(docs/DESIGN-SYSTEM.md §아이콘). 선 굵기 1.75 고정,
// currentColor 상속(텍스트 색과 항상 일치). 모두 장식적 용도 — 의미는 옆의 텍스트가 전달하므로
// aria-hidden으로 스크린리더에서 숨긴다.
type IconProps = SVGProps<SVGSVGElement>;

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  focusable: false,
};

export function IconTransit(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="5" y="3" width="14" height="14" rx="3" />
      <path d="M5 13h14M9 17l-1.5 3M15 17l1.5 3" />
      <circle cx="8.5" cy="8.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="8.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconPrice(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.25c0-1.1 1.1-2 2.5-2s2.5.7 2.5 1.6-.8 1.4-2.5 1.9c-1.7.5-2.5 1-2.5 1.9s1.1 1.6 2.5 1.6 2.5-.9 2.5-2" />
      <path d="M12 6.2v1.1M12 16.7v1.1" />
    </svg>
  );
}

export function IconSeat(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M7 12V6.5A1.5 1.5 0 0 1 8.5 5h7A1.5 1.5 0 0 1 17 6.5V12" />
      <path d="M6 12h12v3.5a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 15.5V12Z" />
      <path d="M6.5 17 6 20M17.5 17l.5 3" />
    </svg>
  );
}

export function IconThumbsUp(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M7 20h9.2a2 2 0 0 0 2-1.7l1-6A2 2 0 0 0 17.2 10H13l.7-3.9A1.6 1.6 0 0 0 12.16 4L7 11" />
      <path d="M7 20V11H4v9h3Z" />
    </svg>
  );
}

export function IconThumbsDown(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M17 4H7.8a2 2 0 0 0-2 1.7l-1 6A2 2 0 0 0 6.8 14H11l-.7 3.9A1.6 1.6 0 0 0 11.84 20L17 13" />
      <path d="M17 4v9h3V4h-3Z" />
    </svg>
  );
}

export function IconQuestion(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 3.7 2.2c-.8.5-1.2 1-1.2 2" />
      <circle cx="12" cy="16.2" r="0.15" fill="currentColor" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function IconWrench(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M14.7 6.3a4 4 0 0 0-5.4 4.6L4 16.2V20h3.8l5.3-5.3a4 4 0 0 0 4.6-5.4l-2.6 2.6-2.1-2.1 2.7-2.7Z" />
    </svg>
  );
}

export function IconNote(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M7 3.5h8L19 8v12.5H7z" />
      <path d="M15 3.5V8h4M9.5 12h5M9.5 15.5h5" />
    </svg>
  );
}

export function IconFilm(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3.5" y="4" width="17" height="16" rx="2" />
      <path d="M8 4v16M16 4v16M3.5 9h4.5M16 9h4.5M3.5 15h4.5M16 15h4.5" />
    </svg>
  );
}

export function IconLightbulb(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M9 18h6M10 21h4" />
      <path d="M12 3a6 6 0 0 0-3.6 10.8c.6.5 1.1 1.3 1.1 2.2h5c0-.9.5-1.7 1.1-2.2A6 6 0 0 0 12 3Z" />
    </svg>
  );
}

export function IconEdit(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
      <path d="M14.5 5.5l3 3" />
    </svg>
  );
}

export function IconWarning(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3.5 21 19H3z" />
      <path d="M12 9.5v4.2" />
      <circle cx="12" cy="16.7" r="0.15" fill="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function IconCheckCircle(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.3 12.3l2.5 2.5 5-5.4" />
    </svg>
  );
}

export function IconExternalLink(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M9 6H5.5A1.5 1.5 0 0 0 4 7.5v11A1.5 1.5 0 0 0 5.5 20h11a1.5 1.5 0 0 0 1.5-1.5V15" />
      <path d="M14 4h6v6M20 4l-9.5 9.5" />
    </svg>
  );
}

export function IconChevronRight(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M9 5.5 15.5 12 9 18.5" />
    </svg>
  );
}

export function IconHome(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 11.5 12 4l8 7.5" />
      <path d="M6 10v9.5h12V10" />
      <path d="M10 19.5V14h4v5.5" />
    </svg>
  );
}

export function IconInfo(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5.5" />
      <circle cx="12" cy="7.6" r="0.15" fill="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
