'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import type { MovieWithSpecs } from '../src/domain/recommendation/types';
import { MovieCard } from './MovieCard';

// 홈에는 대표 8편만 — 나머지는 "전체 보기"로 영화 페이지에 넘긴다(홈이 목록 페이지를
// 대신하지 않게). 데스크톱은 자동 줄바꿈 그리드라 개수가 몇이든 짜부·캐러셀 없이 안전하다.
const HOME_LIMIT = 8;

/**
 * "지금 볼 수 있는 영화" — 데스크톱은 auto-fill 그리드(줄바꿈), 모바일만 다음 카드가 살짝
 * 보이는 가로 스와이프. "영화 개수만큼 열"(13편에서 짜부)과 "전면 캐러셀"(옆으로 계속
 * 넘기는 느낌이 싫다는 피드백) 둘 다를 피하는 구조. 13편 초과분은 전체 보기 링크로.
 */
export function NowShowing({ movies }: { movies: MovieWithSpecs[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  if (movies.length === 0) return null;
  const shown = movies.slice(0, HOME_LIMIT);

  function onScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = el.scrollWidth / shown.length;
    setActive(Math.round(el.scrollLeft / cardWidth));
  }

  return (
    <section aria-labelledby="now-showing-heading" className="enter-2 px-5 py-10 sm:px-10 sm:py-14">
      <div className="mx-auto max-w-wide">
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="now-showing-heading" className="type-display m-0 text-[22px] text-text sm:text-[26px]">
            지금 볼 수 있는 영화
          </h2>
          {movies.length > HOME_LIMIT ? (
            <Link
              href="/movies"
              className="shrink-0 text-[13.5px] font-semibold text-text-sub transition-colors hover:text-primary"
            >
              전체 {movies.length}편 보기 →
            </Link>
          ) : null}
        </div>
        <div className="relative">
          <div
            ref={scrollRef}
            onScroll={onScroll}
            className="mt-4 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 sm:grid sm:gap-5 sm:overflow-visible sm:pb-0 sm:[grid-template-columns:repeat(auto-fill,minmax(230px,1fr))]"
          >
            {shown.map((m) => (
              <MovieCard key={m.id} movie={m} variant="compact" />
            ))}
          </div>
          {/* 넘어간 카드의 글자가 반쯤 잘려 보이지 않게 오른쪽 가장자리를 배경색으로
              페이드아웃 — 모바일 스와이프에서만. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-bg to-transparent sm:hidden"
          />
        </div>
        {shown.length > 1 ? (
          <div className="mt-3 flex justify-center gap-1.5 sm:hidden">
            {shown.map((m, i) => (
              <span
                key={m.id}
                aria-hidden
                className={`h-1.5 rounded-full transition-all ${i === active ? 'w-4 bg-primary' : 'w-1.5 bg-border-strong'}`}
              />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
