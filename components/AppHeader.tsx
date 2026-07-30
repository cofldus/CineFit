'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

// 기존 layout.tsx의 인라인 헤더를 그대로 옮긴 것 — 다른 모든 라우트에서 마크업·동작이
// 완전히 동일하다. 홈('/')에서만 숨긴다: 홈은 스크리닝 룸 콘셉트의 자기 헤더
// (MarketingHeader)를 쓰므로, 기존 공통 헤더가 그 위에 얹히면 안 된다.
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
