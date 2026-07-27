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
        <header className="site-header">
          <div className="inner">
            <Link href="/" className="brand" aria-label="CineFit 홈">
              Cine<em>Fit</em> <span className="sub">시네핏</span>
            </Link>
            <nav className="site-nav" aria-label="주요 메뉴">
              <Link href="/movies">영화</Link>
              <Link href="/sources">데이터 출처</Link>
            </nav>
          </div>
        </header>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
