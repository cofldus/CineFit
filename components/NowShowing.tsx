import type { MovieWithSpecs } from '../src/domain/recommendation/types';
import { MovieCard } from './MovieCard';

/**
 * "지금 볼 수 있는 영화" — 이전의 ScreeningRoomDoor/Grid(관 번호 배지 + 화면비 그러데이션
 * 문짝 일러스트)를 대체한다. 카드마다 큰 이미지가 필요하다는 전제에서 벗어나 공통
 * MovieCard의 compact 변형(얇은 화면비 막대 + 텍스트)을 쓴다 — 모바일에서는 가로 스크롤,
 * sm 이상에서는 그리드로 전환된다.
 */
export function NowShowing({ movies }: { movies: MovieWithSpecs[] }) {
  if (movies.length === 0) return null;

  return (
    <section aria-labelledby="now-showing-heading" className="bg-bg px-5 py-10 sm:px-10 sm:py-14">
      <h2 id="now-showing-heading" className="font-wanted m-0 text-lg font-bold tracking-[-0.01em] text-text">
        지금 볼 수 있는 영화
      </h2>
      <div className="mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:pb-0 lg:grid-cols-4">
        {movies.map((m) => (
          <MovieCard key={m.id} movie={m} variant="compact" />
        ))}
      </div>
    </section>
  );
}
