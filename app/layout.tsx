import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { AppHeader } from '../components/AppHeader';
import { AppOpenedTracker } from '../components/AppOpenedTracker';
import { MarketingHeader } from '../components/MarketingHeader';
import { MobileNav } from '../components/MobileNav';
import { ServiceWorkerRegister } from '../components/ServiceWorkerRegister';
import './globals.css';

// Wanted Sans Variable(한글 글리프 포함, Pretendard 폴백) — font-wanted 유틸리티를 실제로
// 쓰는 헤딩류에만 적용된다. 본문 기본 폰트(--font-sans/Pretendard)는 그대로 둔다 — 폼·표가
// 많은 기존 화면들의 줄바꿈·자간 가정을 흔들지 않기 위해 의도적으로 범위를 좁혔다.
const wantedSans = localFont({
  src: '../node_modules/wanted-sans/fonts/variable/WantedSansVariable.ttf',
  variable: '--font-display',
  weight: '400 900',
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: 'CineFit — 시네핏', template: '%s | CineFit' },
  description:
    '영화에 딱 맞는 상영관을 찾아주는 맞춤형 영화 관람 추천 서비스. 이유가 설명되는 상영관 추천.',
  applicationName: 'CineFit',
};

export const viewport: Viewport = {
  themeColor: '#0d0a09',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={wantedSans.variable}>
      <body>
        <a href="#main-content" className="skip-link">
          본문으로 바로가기
        </a>
        <AppHeader />
        <MarketingHeader />
        <div id="main-content">{children}</div>
        <MobileNav />
        <ServiceWorkerRegister />
        <AppOpenedTracker />
      </body>
    </html>
  );
}
