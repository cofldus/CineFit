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

// 사용자 화면 전체의 헤더(스크리닝 룸 콘셉트) — /admin만 제외한다(components/AppHeader.tsx가
// 그쪽을 맡는다). 다크 전경 위에 얹히므로 배경은 시네마 블랙을 유지한다(스크롤해도 sticky).
export function MarketingHeader() {
  const pathname = usePathname() ?? '/';
  const [menuOpen, setMenuOpen] = useState(false);

  if (pathname.startsWith('/admin')) return null;

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-cinema-black/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1360px] items-center justify-between px-5 py-4 sm:px-8">
        <Link
          href="/"
          className="font-wanted text-lg font-extrabold tracking-[-0.02em] text-cinema-ink"
          aria-label="CineFit 홈"
        >
          CineFit
        </Link>

        <nav className="hidden items-center gap-1 sm:flex" aria-label="주요 메뉴">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="inline-flex min-h-11 items-center px-3 text-sm font-medium text-cinema-ink-muted transition-colors hover:text-cinema-ink"
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/movies"
            className="ml-2 inline-flex min-h-11 items-center rounded-sm bg-cinema-red px-5 text-sm font-semibold text-white transition-colors hover:bg-cinema-red-hover"
          >
            영화 선택하기
          </Link>
        </nav>

        <button
          type="button"
          className="inline-flex min-h-11 min-w-11 items-center justify-center text-cinema-ink sm:hidden"
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
                  className="flex min-h-11 items-center text-sm font-medium text-cinema-ink-muted"
                  onClick={() => setMenuOpen(false)}
                >
                  {l.label}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/movies"
                className="mt-2 flex min-h-11 items-center justify-center rounded-sm bg-cinema-red px-5 text-sm font-semibold text-white"
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
