import type { Metadata } from 'next';
import localFont from 'next/font/local';
import type { ReactNode } from 'react';

// Design Lab 전용 폰트 로딩 — 루트 레이아웃(app/layout.tsx)이나 globals.css는 건드리지
// 않는다(운영 화면 무영향). Wanted Sans는 이 서브트리 안에서만 CSS 변수로 노출되고,
// 각 시안이 자기 스타일에서 이 변수를 직접 참조한다.
const wantedSans = localFont({
  src: '../../node_modules/wanted-sans/fonts/variable/WantedSansVariable.ttf',
  variable: '--lab-font-display',
  weight: '400 900',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Design Lab | CineFit',
  robots: { index: false, follow: false },
};

export default function DesignLabLayout({ children }: { children: ReactNode }) {
  return <div className={wantedSans.variable}>{children}</div>;
}
