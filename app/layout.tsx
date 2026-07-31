import type { Metadata, Viewport } from 'next';
import { AppHeader } from '../components/AppHeader';
import { AppOpenedTracker } from '../components/AppOpenedTracker';
import { MarketingHeader } from '../components/MarketingHeader';
import { MobileNav } from '../components/MobileNav';
import { ServiceWorkerRegister } from '../components/ServiceWorkerRegister';
import './globals.css';

// 폰트는 Pretendard Variable 하나로 통일한다(브리프: "외국 SaaS 느낌의 기하학적 서체를
// 줄이고 Pretendard 하나로"). 이전에 헤딩류에만 얹었던 별도 디스플레이 서체(Wanted Sans)는
// 완전히 뺐다 — --font-sans(전역 기본값)가 모든 텍스트에 그대로 적용된다.

export const metadata: Metadata = {
  title: { default: 'CineFit — 시네핏', template: '%s | CineFit' },
  description:
    '영화에 딱 맞는 상영관을 찾아주는 맞춤형 영화 관람 추천 서비스. 이유가 설명되는 상영관 추천.',
  applicationName: 'CineFit',
};

export const viewport: Viewport = {
  themeColor: '#191714',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
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
