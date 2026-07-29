import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque, Geist_Mono, Hanken_Grotesk } from 'next/font/google';
import Link from 'next/link';
import { AppOpenedTracker } from '../components/AppOpenedTracker';
import { MobileNav } from '../components/MobileNav';
import { ServiceWorkerRegister } from '../components/ServiceWorkerRegister';
import './globals.css';

// Cinematic Editorial Utility 타이포그래피(design/reference/cinefit/DESIGN.md) — 셋 다
// 한글 글리프가 없어 한글은 자동으로 Pretendard로 폴백된다(globals.css의 font-family 스택
// 마지막에 Pretendard를 둠) — 영문·숫자·기호(제목의 영문 단어, "2.39:1", "IMAX" 같은 라벨)만
// 이 폰트로 그려지고 한글 프로즈는 그대로 Pretendard로 읽힌다. 의도된 동작이다.
const displayFont = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['700', '800'],
  display: 'swap',
});
const editorialBody = Hanken_Grotesk({
  subsets: ['latin'],
  variable: '--font-editorial-body',
  weight: ['400', '500', '600'],
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
    <html lang="ko" className={`${displayFont.variable} ${editorialBody.variable} ${labelMono.variable}`}>
      <body>
        <a href="#main-content" className="skip-link">
          본문으로 바로가기
        </a>
        <header className="sticky top-0 z-40 border-b border-border bg-surface/85 backdrop-blur-md">
          <div className="mx-auto flex max-w-wide items-center justify-between px-4 py-3">
            <Link
              href="/"
              className="inline-flex min-h-11 items-center gap-1.5 text-lg font-extrabold tracking-tight text-text"
              aria-label="CineFit 홈"
            >
              <span className="inline-block h-2 w-2 rounded-full bg-primary" aria-hidden />
              Cine<span className="text-primary">Fit</span>
            </Link>
            <nav className="hidden items-center gap-1 sm:flex" aria-label="주요 메뉴">
              <Link
                href="/movies"
                className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-text-sub transition-colors hover:bg-bg hover:text-text"
              >
                영화 찾기
              </Link>
              <Link
                href="/search"
                className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-text-sub transition-colors hover:bg-bg hover:text-text"
              >
                검색
              </Link>
              <Link
                href="/sources"
                className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-text-sub transition-colors hover:bg-bg hover:text-text"
              >
                출처 안내
              </Link>
            </nav>
          </div>
        </header>
        <div id="main-content">{children}</div>
        <MobileNav />
        <ServiceWorkerRegister />
        <AppOpenedTracker />
      </body>
    </html>
  );
}
