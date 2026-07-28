'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { IconFilm, IconHome, IconInfo } from './Icon';

// 모바일 하단 내비 — 데스크톱은 상단 헤더 내비만 사용(sm 이상 숨김). 관리자 링크는 넣지 않는다.
const ITEMS = [
  { href: '/', label: '홈', Icon: IconHome, match: (p: string) => p === '/' },
  { href: '/movies', label: '영화', Icon: IconFilm, match: (p: string) => p.startsWith('/movies') || p.startsWith('/recommend') || p.startsWith('/results') },
  { href: '/sources', label: '출처', Icon: IconInfo, match: (p: string) => p.startsWith('/sources') || p.startsWith('/cinemas') },
] as const;

export function MobileNav() {
  const pathname = usePathname() ?? '/';
  // /admin: 관리자 전용 화면. /recommend: 폼 자체의 sticky 제출 바와 겹치므로 숨긴다.
  if (pathname.startsWith('/admin') || pathname.startsWith('/recommend')) return null;

  return (
    <nav
      aria-label="하단 메뉴"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur-md sm:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="mx-auto flex max-w-wide items-stretch justify-around">
        {ITEMS.map(({ href, label, Icon, match }) => {
          const active = match(pathname);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={`flex min-h-14 min-w-16 flex-col items-center justify-center gap-0.5 px-2 text-xs font-medium transition-colors ${
                active ? 'text-primary' : 'text-text-sub hover:text-text'
              }`}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
