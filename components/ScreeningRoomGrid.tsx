import type { MovieWithSpecs } from '../src/domain/recommendation/types';
import { ScreeningRoomDoor } from './ScreeningRoomDoor';

// "지금 상영 중" — 카드 대신 실제 멀티플렉스 언어(1관·2관·3관)로 된 상영관 문. 영화 개수가
// 늘어나도 그대로 확장된다.
export function ScreeningRoomGrid({ movies }: { movies: MovieWithSpecs[] }) {
  if (movies.length === 0) return null;

  return (
    <section aria-labelledby="screening-room-heading" className="bg-cinema-black px-5 py-16 sm:px-10 sm:py-24">
      <h2
        id="screening-room-heading"
        className="m-0 text-center font-mono text-xs font-semibold tracking-[0.25em] text-cinema-ink-muted"
      >
        지금 상영 중
      </h2>

      <div className="mx-auto mt-10 grid max-w-5xl grid-cols-1 gap-8 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
        {movies.map((m, i) => (
          <ScreeningRoomDoor key={m.id} movie={m} roomNumber={i + 1} />
        ))}
      </div>
    </section>
  );
}
