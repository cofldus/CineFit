import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
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
        <header className="sticky top-0 z-40 border-b border-border bg-surface/85 backdrop-blur-md">
          <div className="mx-auto flex max-w-xl items-center justify-between px-4 py-3">
            <Link
              href="/"
              className="inline-flex min-h-11 items-center gap-1.5 text-lg font-extrabold tracking-tight text-text"
              aria-label="CineFit 홈"
            >
              <span className="inline-block h-2 w-2 rounded-full bg-primary" aria-hidden />
              Cine<span className="text-primary">Fit</span>
            </Link>
            <nav className="flex items-center gap-1" aria-label="주요 메뉴">
              <Link
                href="/movies"
                className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-text-sub transition-colors hover:bg-bg hover:text-text"
              >
                영화 찾기
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
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
