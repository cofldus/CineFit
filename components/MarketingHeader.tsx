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
 * 페이지가 라이트(검색·폼·출처)든 다크(홈·추천·상영관 상세)든 헤더 자체는 항상
 * cinema-scope(어두운 톤)로 고정한다 — 두 팔레트를 하나의 브랜드로 잇는 공통 요소다.
 * 투명하게 시작해 스크롤하면 배경이 나타나던 이전 방식은 라이트 페이지 위에서 흰 페이지
 * 배경에 흰 텍스트가 그대로 노출되는 문제가 있어(헤더 텍스트는 cinema-scope라 항상
 * 밝은색) 그만두고, 처음부터 항상 불투명하게 보인다. 활성 메뉴는 빨간 글자 반복 대신
 * 밑줄 하나가 링크 위치로 미끄러지듯 이동한다(실제 DOM 위치를 측정해서 이동시킨다 —
 * Framer Motion 없이 순수 CSS transition + ref 측정만으로 구현).
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
      className={`cinema-scope sticky top-0 z-40 border-b border-border bg-bg/95 backdrop-blur-md transition-shadow duration-300 ${
        scrolled ? 'shadow-modal' : ''
      }`}
    >
      <div className="mx-auto flex h-[76px] max-w-wide items-center justify-between px-5 sm:px-8">
        <Link href="/" className="inline-flex items-center gap-2" aria-label="CineFit 홈">
          {/* 로고 점은 더 이상 액센트 컬러를 쓰지 않는다 — 파랑은 CTA·선택·포커스·활성
              내비게이션 전용이라 상시 노출되는 장식 요소에는 어울리지 않는다(브리프 "코랄
              로고 점 제거" 요구를 색이 바뀐 지금도 같은 원칙으로 적용: 중립 톤으로). */}
          <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-text" />
          <span className="text-xl font-bold text-text sm:text-2xl">CineFit</span>
        </Link>

        <nav ref={navRef} className="relative hidden items-center gap-2 sm:flex" aria-label="주요 메뉴">
          {indicator ? (
            <span
              aria-hidden
              className="absolute bottom-1 h-[2px] rounded-full bg-primary transition-all duration-[250ms] ease-out"
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
                className={`inline-flex min-h-11 items-center px-4 text-[15px] font-medium transition-colors ${
                  active ? 'text-text' : 'text-text-sub hover:text-text'
                }`}
              >
                {l.label}
              </Link>
            );
          })}
          <Link
            href="/movies"
            className="ml-3 inline-flex min-h-11 items-center rounded-card bg-primary-strong px-4 text-sm font-semibold text-white transition-all hover:bg-primary-strong-hover active:scale-[0.98]"
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
