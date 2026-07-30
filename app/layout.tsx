import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { AppHeader } from '../components/AppHeader';
import { AppOpenedTracker } from '../components/AppOpenedTracker';
import { MobileNav } from '../components/MobileNav';
import { ServiceWorkerRegister } from '../components/ServiceWorkerRegister';
import './globals.css';

// 홈 전용 — Wanted Sans Variable(한글 글리프 포함, Pretendard 폴백). 다른 화면은 계속
// 기존 --font-sans(Pretendard)를 쓴다(font-wanted 유틸리티를 실제로 쓰는 곳만 적용됨).
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
  themeColor: '#0E1116',
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
        <div id="main-content">{children}</div>
        <MobileNav />
        <ServiceWorkerRegister />
        <AppOpenedTracker />
      </body>
    </html>
  );
}
