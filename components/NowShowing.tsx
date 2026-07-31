'use client';

import { useRef, useState } from 'react';
import type { MovieWithSpecs } from '../src/domain/recommendation/types';
import { MovieCard } from './MovieCard';

/**
 * "지금 볼 수 있는 영화" — 데스크톱은 콘텐츠 폭 전체를 쓰는 그리드(영화 개수만큼 열을
 * 잡는다 — 4열로 고정했더니 영화가 3편일 때 오른쪽에 빈 열이 그대로 남는 문제가 있었다).
 * 모바일은 카드 85% 폭 + 다음 카드가 살짝 보이는 가로 스크롤이고, 스크롤 위치를 추적해
 * 아래 진행 점으로 표시한다.
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
        <h2 id="now-showing-heading" className="font-wanted m-0 text-lg font-bold tracking-[-0.01em] text-text">
          지금 볼 수 있는 영화
        </h2>
        <div
          ref={scrollRef}
          onScroll={onScroll}
          className="mt-4 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 sm:grid sm:gap-5 sm:overflow-visible sm:pb-0"
          style={{ gridTemplateColumns: `repeat(${movies.length}, minmax(0, 1fr))` }}
        >
          {movies.map((m) => (
            <MovieCard key={m.id} movie={m} variant="compact" />
          ))}
        </div>
        {movies.length > 1 ? (
          <div className="mt-3 flex justify-center gap-1.5 sm:hidden">
            {movies.map((m, i) => (
              <span
                key={m.id}
                aria-hidden
                className={`h-1.5 rounded-full transition-all ${i === active ? 'w-4 bg-primary-strong' : 'w-1.5 bg-border-strong'}`}
              />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
