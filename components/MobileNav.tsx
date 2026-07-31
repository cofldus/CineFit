'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { IconFilm, IconHome, IconInfo, IconSearch } from './Icon';

// 모바일 하단 내비 — 데스크톱은 상단 헤더 내비만 사용(sm 이상 숨김). 관리자 링크는 넣지 않는다.
const ITEMS = [
  { href: '/', label: '홈', Icon: IconHome, match: (p: string) => p === '/' },
  { href: '/movies', label: '영화', Icon: IconFilm, match: (p: string) => p.startsWith('/movies') || p.startsWith('/recommend') || p.startsWith('/results') },
  { href: '/search', label: '검색', Icon: IconSearch, match: (p: string) => p.startsWith('/search') },
  { href: '/sources', label: '출처', Icon: IconInfo, match: (p: string) => p.startsWith('/sources') || p.startsWith('/cinemas') },
] as const;

export function MobileNav() {
  const pathname = usePathname() ?? '/';
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);

  // 아래로 스크롤하면 숨기고 위로 스크롤하면 다시 보여준다 — 고정 내비가 콘텐츠를 계속
  // 가리는 문제를 페이지 전체에서 완화한다(/results는 그와 별개로 아예 숨김, 아래 참고).
  useEffect(() => {
    lastY.current = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      const delta = y - lastY.current;
      if (y < 24) setHidden(false);
      else if (delta > 4) setHidden(true);
      else if (delta < -4) setHidden(false);
      lastY.current = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // /admin: 관리자 전용 화면. /recommend·/results: 폼 자체의 sticky 제출 바 및 대표 추천
  // CTA와 겹친다. 홈('/'): 자기 헤더·CTA를 쓴다. 그 외 브리프가 명시한 폼형 진입/이탈
  // 화면(피드백·제보·개인정보 요청·알파 동의·초대)도 각자의 CTA에 집중해야 하는 단일 목적
  // 화면이라 전역 내비를 숨긴다 — 상영관 상세 자체(비-제보 경로)는 계속 노출한다.
  const isReportForm = pathname.startsWith('/cinemas') && pathname.endsWith('/report');
  if (
    pathname === '/' ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/recommend') ||
    pathname.startsWith('/results') ||
    pathname.startsWith('/feedback') ||
    pathname.startsWith('/privacy') ||
    pathname.startsWith('/alpha') ||
    isReportForm
  )
    return null;

  return (
    <nav
      aria-label="하단 메뉴"
      className={`cinema-scope fixed inset-x-0 bottom-0 z-40 border-t border-border bg-bg/92 backdrop-blur-md transition-transform duration-300 sm:hidden ${
        hidden ? 'translate-y-full' : 'translate-y-0'
      }`}
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
                active ? 'text-primary-strong' : 'text-text-sub hover:text-text'
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
