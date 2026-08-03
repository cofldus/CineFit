import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
// 본문 폰트 실로드 — 지금까지 font-family 스택에 이름만 있고 패키지가 설치돼 있지 않아
// Windows에서 맑은 고딕으로 폴백되고 있었다("작은 글씨가 깨져 보인다" 피드백의 원인).
// dynamic subset: 한글 전체(~2MB)가 아니라 화면에 쓰인 글자 블록만 unicode-range로 나눠
// 받는다 — 최초 로드가 가볍고 셀프호스팅이라 외부 CDN 의존도 없다.
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css';
import { AppHeader } from '../components/AppHeader';
import { AppOpenedTracker } from '../components/AppOpenedTracker';
import { MarketingHeader } from '../components/MarketingHeader';
import { MobileNav } from '../components/MobileNav';
import { ServiceWorkerRegister } from '../components/ServiceWorkerRegister';
import './globals.css';

// 본문·버튼·데이터는 Pretendard Variable(전역 기본값, --font-sans)로 계속 통일한다. 큰
// 헤드라인만 Paperlogy 대신(패키지로 배포되지 않아 설치 불가) 사용자가 대안으로 지목한
// Wanted Sans ExtraBold를 별도 --font-display 변수로 얹는다 — font-headline 유틸리티를
// 실제로 쓰는 헤드라인 자리에만 적용되고, 본문 폰트는 이 변수와 무관하다.
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
  themeColor: '#191714',
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
