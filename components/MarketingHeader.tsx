'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { IconMenu } from './Icon';

const NAV_LINKS = [
  { href: '/movies', label: '영화 찾기' },
  { href: '/search', label: '상영관' },
  { href: '/sources', label: 'CineFit 정보' },
] as const;

/**
 * 사용자 화면 전체의 헤더 — /admin만 제외한다(components/AppHeader.tsx가 그쪽을 맡는다).
 * 초기에는 투명(히어로 배경이 그대로 비침)하다가 스크롤하면 blur+반투명 배경으로 전환된다
 * — 항상 불투명한 다크 바가 떠 있는 것보다 첫 화면이 덜 답답해 보인다. 활성 메뉴는 빨간
 * 글자 반복 대신 밑줄 하나가 링크 위치로 미끄러지듯 이동한다(실제 DOM 위치를 측정해서
 * 이동시킨다 — Framer Motion 없이 순수 CSS transition + ref 측정만으로 구현).
 */
export function MarketingHeader() {
  const pathname = usePathname() ?? '/';
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const linkRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const activeHref = NAV_LINKS.find((l) => pathname.startsWith(l.href))?.href;
    const el = activeHref ? linkRefs.current[activeHref] : null;
    if (el && navRef.current) {
      const navBox = navRef.current.getBoundingClientRect();
      const elBox = el.getBoundingClientRect();
      setIndicator({ left: elBox.left - navBox.left, width: elBox.width });
    } else {
      setIndicator(null);
    }
  }, [pathname]);

  if (pathname.startsWith('/admin')) return null;

  return (
    <header
      className={`sticky top-0 z-40 border-b transition-colors duration-300 ${
        scrolled ? 'border-border bg-bg/90 backdrop-blur-md' : 'border-transparent bg-transparent'
      }`}
    >
      <div className="mx-auto flex max-w-wide items-center justify-between px-5 py-4 sm:px-8">
        <Link
          href="/"
          className="font-wanted text-lg font-extrabold tracking-[-0.02em] text-text"
          aria-label="CineFit 홈"
        >
          CineFit
        </Link>

        <nav ref={navRef} className="relative hidden items-center gap-1 sm:flex" aria-label="주요 메뉴">
          {indicator ? (
            <span
              aria-hidden
              className="absolute bottom-0 h-0.5 rounded-full bg-primary-strong transition-all duration-[250ms] ease-out"
              style={{ left: indicator.left, width: indicator.width }}
            />
          ) : null}
          {NAV_LINKS.map((l) => {
            const active = pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                ref={(el) => {
                  linkRefs.current[l.href] = el;
                }}
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
            className="ml-2 inline-flex min-h-11 items-center rounded-card bg-primary-strong px-5 text-sm font-semibold text-white transition-all hover:bg-primary-strong-hover active:scale-[0.98]"
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
        <nav
          id="marketing-mobile-menu"
          aria-label="주요 메뉴(모바일)"
          className="border-t border-border bg-bg px-5 py-3 sm:hidden"
        >
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
                className="mt-2 flex min-h-11 items-center justify-center rounded-card bg-primary-strong px-5 text-sm font-semibold text-white active:scale-[0.98]"
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
