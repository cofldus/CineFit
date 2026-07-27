import type { Metadata } from 'next';
import { MovieCard } from '../../components/MovieCard';
import { Notice } from '../../components/Notice';
import { movieRepository } from '../../src/data/movieRepository';

export const metadata: Metadata = { title: '영화 선택' };
export const dynamic = 'force-dynamic';

export default function MoviesPage() {
  const movies = movieRepository.list();

  return (
    <main className="mx-auto max-w-xl px-4 pb-24 pt-6">
      <h1 className="text-2xl font-extrabold text-text">어떤 영화를 보러 가세요?</h1>
      <div className="mt-3">
        <Notice>
          지금은 테스트용으로 준비한 영화 {movies.length}편이에요. 사양 값마다 출처와 확인 날짜를
          같이 보여드리고, 확인되지 않은 항목은 추천 점수에 그만큼 반영돼요.
        </Notice>
      </div>
      {movies.length === 0 ? (
        <div className="mt-6 rounded-card-lg border border-border bg-surface p-5">
          <h3 className="m-0 text-lg font-bold text-text">아직 영화 정보가 없어요</h3>
          <p className="mt-2 text-sm text-text-sub">
            터미널에서{' '}
            <code className="rounded-md bg-bg px-1.5 py-0.5 text-[13px]">npm run db:seed</code>를
            실행해 테스트용 데이터를 만들어 주세요.
          </p>
        </div>
      ) : (
        <div className="mt-5 flex flex-col gap-3">
          {movies.map((m) => (
            <MovieCard key={m.id} movie={m} />
          ))}
        </div>
      )}
    </main>
  );
}
