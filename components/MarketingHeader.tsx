'use client';

import Link from 'next/link';
import { useState } from 'react';
import { IconMenu } from './Icon';

const NAV_LINKS = [
  { href: '/movies', label: '영화 찾기' },
  { href: '/search', label: '상영관' },
  { href: '/sources', label: 'CineFit 정보' },
] as const;

// 홈 전용 헤더 — 다른 화면은 기존 헤더(components/AppHeader.tsx)를 그대로 쓴다. 다크 히어로
// 위에 얹히므로 배경은 히어로와 같은 딥 네이비를 유지한다(스크롤해도 sticky).
export function MarketingHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-home-navy/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1360px] items-center justify-between px-5 py-4 sm:px-8 lg:px-16">
        <Link href="/" className="font-wanted text-lg font-extrabold tracking-[-0.02em] text-home-navy-ink" aria-label="CineFit 홈">
          CineFit
        </Link>

        <nav className="hidden items-center gap-1 sm:flex" aria-label="주요 메뉴">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="inline-flex min-h-11 items-center px-3 text-sm font-medium tracking-[-0.01em] text-home-navy-ink-muted transition-colors hover:text-home-navy-ink"
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/movies"
            className="group ml-2 inline-flex min-h-11 items-center gap-1.5 rounded-full bg-home-brand px-5 text-sm font-semibold text-white transition-[background-color,gap] duration-200 hover:gap-2.5 hover:bg-home-brand-hover"
          >
            영화 선택하기
          </Link>
        </nav>

        <button
          type="button"
          className="inline-flex min-h-11 min-w-11 items-center justify-center text-home-navy-ink sm:hidden"
          aria-expanded={menuOpen}
          aria-controls="marketing-mobile-menu"
          aria-label="메뉴 열기"
          onClick={() => setMenuOpen((v) => !v)}
        >
          <IconMenu className="h-6 w-6" />
        </button>
      </div>

      {menuOpen && (
        <nav id="marketing-mobile-menu" aria-label="주요 메뉴(모바일)" className="border-t border-white/10 px-5 py-3 sm:hidden">
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {NAV_LINKS.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="flex min-h-11 items-center text-sm font-medium text-home-navy-ink-muted"
                  onClick={() => setMenuOpen(false)}
                >
                  {l.label}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/movies"
                className="mt-2 flex min-h-11 items-center justify-center rounded-full bg-home-brand px-5 text-sm font-semibold text-white"
                onClick={() => setMenuOpen(false)}
              >
                영화 선택하기
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
