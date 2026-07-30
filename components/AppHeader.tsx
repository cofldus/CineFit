'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

// 기존 layout.tsx의 인라인 헤더를 그대로 옮긴 것. 사용자 화면은 전부 MarketingHeader(스크리닝
// 룸 콘셉트)를 쓰게 됐고, 이 헤더는 /admin에만 남긴다 — 관리자 화면은 사용자 브랜드 경험과
// 의도적으로 구분한다(운영 도구는 운영 도구답게, §12 "사용자 화면과 관리자 화면은 구분").
export function AppHeader() {
  const pathname = usePathname() ?? '/';
  if (!pathname.startsWith('/admin')) return null;

  // admin-scope: 이 지점에 도달했다는 건 이미 /admin이 확정됐다는 뜻이다(위 조건문) — 사이트
  // 전역 토큰이 시네마 레드로 바뀌어도 관리자 화면만은 기존 블루 팔레트를 쓰도록 이 클래스가
  // globals.css에서 --bg/--primary 등을 지역적으로 되돌린다. 배경은 반투명(bg-surface/85 +
  // backdrop-blur)이 아니라 불투명 bg-surface로 바꿨다 — 반투명이면 이 헤더 뒤에 실제로
  // 비치는 건 admin-scope 밖의 body(사이트 전역 다크 배경)라서, 관리자용 블루 텍스트색과
  // 섞여 대비가 깨진다(axe가 실제로 3.68:1로 잡아냄).
  return (
    <header className="admin-scope sticky top-0 z-40 border-b border-border bg-surface">
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
