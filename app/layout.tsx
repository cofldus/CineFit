import type { Metadata, Viewport } from 'next';
import { AppHeader } from '../components/AppHeader';
import { AppOpenedTracker } from '../components/AppOpenedTracker';
import { MobileNav } from '../components/MobileNav';
import { ServiceWorkerRegister } from '../components/ServiceWorkerRegister';
import './globals.css';

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
    <html lang="ko">
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
