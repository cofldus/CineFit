'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

// 홈("/")은 자기 자신의 MarketingHeader를 렌더링한다(components/MarketingHeader.tsx) — 이번
// 작업 범위가 홈 화면 재구축뿐이라, 다른 화면의 헤더는 절대 건드리지 않고 그대로 유지한다.
export function AppHeader() {
  const pathname = usePathname() ?? '/';
  if (pathname === '/') return null;

  return (
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
  );
}
