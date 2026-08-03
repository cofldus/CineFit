import type { Metadata } from 'next';
import { MovieList } from '../../components/MovieList';
import { Notice } from '../../components/Notice';
import { movieRepository } from '../../src/data/movieRepository';

export const metadata: Metadata = { title: '영화 선택' };
export const dynamic = 'force-dynamic';

export default async function MoviesPage() {
  const movies = await movieRepository.list();

  return (
    <main className="cinema-scope min-h-dvh max-w-none bg-bg px-4 pb-24 pt-10 sm:pt-14">
      {/* 다크 배경은 main이 전폭으로 채우고(넓은 화면에서 밝은 여백이 드러나지 않게),
          내용만 이 래퍼로 제한한다. */}
      {/* R14 보강: 목록만 좌우로 넓게 퍼지던 max-w-wide 대신, 카탈로그(좌 필터 레일 + 우
          목록)에 맞는 폭으로 조인다. 헤더 타이포도 extrabold → type-display 700. */}
      <div className="mx-auto max-w-6xl">
      <p className="m-0 text-[13px] font-bold uppercase tracking-[0.08em] text-accent">영화 선택</p>
      <h1 className="type-display m-0 mt-2 text-[30px] sm:text-[36px]">어떤 영화를 보러 가세요?</h1>
      <p className="m-0 mt-2 max-w-content text-[15px] text-text-sub">
        오늘 상영 중인 작품 중 하나를 고르면, 그 영화에 가장 잘 맞는 상영관을 찾아드릴게요.
      </p>
      <div className="mt-4 max-w-content">
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
        <div className="mt-8">
          <MovieList movies={movies} />
        </div>
      )}
      </div>
    </main>
  );
}
