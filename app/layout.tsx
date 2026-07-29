import type { Metadata, Viewport } from 'next';
import { Geist_Mono } from 'next/font/google';
import localFont from 'next/font/local';
import { AppHeader } from '../components/AppHeader';
import { AppOpenedTracker } from '../components/AppOpenedTracker';
import { MobileNav } from '../components/MobileNav';
import { ServiceWorkerRegister } from '../components/ServiceWorkerRegister';
import './globals.css';

// 사용자 확정(2026-07-29): 한글 글리프를 직접 포함한 가변 폰트(Wanted Sans)로 제목·본문을
// 통일한다 — Pretendard 폴백 없이 한글도 이 폰트 그대로 그려진다(Bricolage Grotesque/Baloo
// 2/Hanken Grotesk는 전부 한글 글리프가 없어 시도했던 이전 안이었다). 굵기별 자간·행간은
// docs/UI-REDESIGN-AUDIT.md의 타이포그래피 표를 각 컴포넌트에서 그대로 적용한다.
const editorialFont = localFont({
  src: '../node_modules/wanted-sans/fonts/variable/WantedSansVariable.ttf',
  variable: '--font-display',
  weight: '400 900',
  display: 'swap',
});
const labelMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-label-mono',
  weight: ['400', '500'],
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
    <html lang="ko" className={`${editorialFont.variable} ${labelMono.variable}`}>
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
