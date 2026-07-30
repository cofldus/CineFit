'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { IconMenu } from './Icon';

const NAV_LINKS = [
  { href: '/movies', label: '영화 찾기' },
  { href: '/search', label: '상영관' },
  { href: '/sources', label: 'CineFit 정보' },
] as const;

// 사용자 화면 전체의 헤더 — /admin만 제외한다(components/AppHeader.tsx가 그쪽을 맡는다).
// 사이트 전역 토큰(--bg/--text 등)을 그대로 쓴다 — 홈만 다른 팔레트였던 이전 라운드의
// cinema-* 토큰은 전부 걷어냈다.
export function MarketingHeader() {
  const pathname = usePathname() ?? '/';
  const [menuOpen, setMenuOpen] = useState(false);

  if (pathname.startsWith('/admin')) return null;

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-wide items-center justify-between px-5 py-4 sm:px-8">
        <Link
          href="/"
          className="font-wanted text-lg font-extrabold tracking-[-0.02em] text-text"
          aria-label="CineFit 홈"
        >
          CineFit
        </Link>

        <nav className="hidden items-center gap-1 sm:flex" aria-label="주요 메뉴">
          {NAV_LINKS.map((l) => {
            const active = pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? 'page' : undefined}
                className={`inline-flex min-h-11 items-center px-3 text-sm font-medium transition-colors ${
                  active ? 'text-text' : 'text-text-sub hover:text-text'
                }`}
              >
                {l.label}
              </Link>
            );
          })}
          <Link
            href="/movies"
            className="ml-2 inline-flex min-h-11 items-center rounded-card bg-primary-strong px-5 text-sm font-semibold text-white transition-colors hover:bg-primary-strong-hover"
          >
            영화 선택하기
          </Link>
        </nav>

        <button
          type="button"
          className="inline-flex min-h-11 min-w-11 items-center justify-center text-text sm:hidden"
          aria-expanded={menuOpen}
          aria-controls="marketing-mobile-menu"
          aria-label="메뉴 열기"
          onClick={() => setMenuOpen((v) => !v)}
        >
          <IconMenu className="h-6 w-6" />
        </button>
      </div>

      {menuOpen && (
        <nav id="marketing-mobile-menu" aria-label="주요 메뉴(모바일)" className="border-t border-border px-5 py-3 sm:hidden">
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {NAV_LINKS.map((l) => {
              const active = pathname.startsWith(l.href);
              return (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    aria-current={active ? 'page' : undefined}
                    className={`flex min-h-11 items-center text-sm font-medium ${active ? 'text-text' : 'text-text-sub'}`}
                    onClick={() => setMenuOpen(false)}
                  >
                    {l.label}
                  </Link>
                </li>
              );
            })}
            <li>
              <Link
                href="/movies"
                className="mt-2 flex min-h-11 items-center justify-center rounded-card bg-primary-strong px-5 text-sm font-semibold text-white"
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
