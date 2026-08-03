'use client';

import { useRef, useState } from 'react';
import type { MovieWithSpecs } from '../src/domain/recommendation/types';
import { MovieCard } from './MovieCard';

/**
 * "지금 볼 수 있는 영화" — 모든 화면에서 고정 폭 카드의 가로 스크롤 캐러셀.
 * 이전의 "영화 개수만큼 열을 잡는 데스크톱 그리드"는 실제 카탈로그가 13편으로 늘어나자
 * 13열로 짜부되는 사고가 났다(실데이터 확충 직후 실측) — 카드 폭을 고정하고 개수는
 * 스크롤로 흡수하는 구조가 개수 변화에 안전하다. 모바일은 다음 카드가 살짝 보이는
 * 85% 폭 + 진행 점, 데스크톱은 250px 고정 폭.
 */
export function NowShowing({ movies }: { movies: MovieWithSpecs[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  if (movies.length === 0) return null;

  function onScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = el.scrollWidth / movies.length;
    setActive(Math.round(el.scrollLeft / cardWidth));
  }

  return (
    <section aria-labelledby="now-showing-heading" className="enter-2 px-5 py-10 sm:px-10 sm:py-14">
      <div className="mx-auto max-w-wide">
        <h2 id="now-showing-heading" className="type-display m-0 text-[22px] text-text sm:text-[26px]">
          지금 볼 수 있는 영화
        </h2>
        <div className="relative">
          <div
            ref={scrollRef}
            onScroll={onScroll}
            className="mt-4 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 sm:gap-5"
          >
            {movies.map((m) => (
              <MovieCard key={m.id} movie={m} variant="compact" />
            ))}
          </div>
          {/* 넘어간 카드의 글자가 반쯤 잘려 보이지 않게 오른쪽 가장자리를 배경색으로
              페이드아웃 — 이제 모든 화면이 캐러셀이라 데스크톱에도 적용한다. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-bg to-transparent"
          />
        </div>
        {movies.length > 1 ? (
          <div className="mt-3 flex justify-center gap-1.5 sm:hidden">
            {movies.map((m, i) => (
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
