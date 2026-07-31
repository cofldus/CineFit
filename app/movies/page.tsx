import type { Metadata } from 'next';
import { MovieCard } from '../../components/MovieCard';
import { Notice } from '../../components/Notice';
import { movieRepository } from '../../src/data/movieRepository';

export const metadata: Metadata = { title: '영화 선택' };
export const dynamic = 'force-dynamic';

export default async function MoviesPage() {
  const movies = await movieRepository.list();

  return (
    <main className="cinema-scope mx-auto min-h-dvh max-w-wide bg-bg px-4 pb-24 pt-10 sm:pt-14">
      <p className="m-0 text-[13px] font-bold uppercase tracking-[0.08em] text-primary">영화 선택</p>
      <h1 className="font-wanted m-0 mt-2 text-[32px] font-bold tracking-[-0.02em] text-text sm:text-[38px]">
        어떤 영화를 보러 가세요?
      </h1>
      <div className="mt-3 max-w-content">
        <Notice>
          지금은 테스트용으로 준비한 영화 {movies.length}편이에요. 사양 값마다 출처와 확인 날짜를
          같이 보여드리고, 확인되지 않은 항목은 추천 점수에 그만큼 반영돼요.
        </Notice>
      </div>
      {movies.length === 0 ? (
        <div className="mt-8 max-w-content border-t border-border pt-6">
          <h3 className="m-0 text-lg font-bold text-text">아직 영화 정보가 없어요</h3>
          <p className="mt-2 text-sm text-text-sub">
            터미널에서{' '}
            <code className="rounded-md bg-surface-strong px-1.5 py-0.5 text-[13px]">npm run db:seed</code>를
            실행해 테스트용 데이터를 만들어 주세요.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {movies.map((m) => (
            <MovieCard key={m.id} movie={m} />
          ))}
        </div>
      )}
    </main>
  );
}
