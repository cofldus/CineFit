'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BetaStatus } from './BetaStatus';

const NAV_LINKS = [
  { href: '/movies', label: '영화 찾기' },
  { href: '/search', label: '검색' },
  { href: '/sources', label: '출처 안내' },
] as const;

// 관리자 화면은 기존(레거시 토큰) 헤더를 그대로 유지한다 — app/admin/layout.tsx가 이미 자체
// nav를 갖고 있고, 여기서 새 에디토리얼 스타일을 섞으면 §4가 금지하는 "관리자·사용자 화면
// 디자인 혼합"이 된다. MobileNav.tsx가 이미 같은 방식으로 /admin 경로를 분기해 왔다.
export function AppHeader() {
  const pathname = usePathname() ?? '/';
  const isAdmin = pathname.startsWith('/admin');

  if (isAdmin) {
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
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-text-sub transition-colors hover:bg-bg hover:text-text"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-40 border-b border-ed-hairline bg-ed-canvas/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-wide items-center justify-between px-4 py-3.5">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center gap-2.5 font-display text-lg font-extrabold tracking-tight text-ed-ink"
          aria-label="CineFit 홈"
        >
          <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-ed-gold" aria-hidden />
          CineFit
          <BetaStatus />
        </Link>
        <nav className="hidden items-center gap-1 sm:flex" aria-label="주요 메뉴">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="inline-flex min-h-11 items-center px-3 text-sm font-medium text-ed-ink-muted transition-colors hover:text-ed-ink"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
