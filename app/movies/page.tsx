import type { Metadata } from 'next';
import { MovieCard } from '../../components/MovieCard';
import { movieRepository } from '../../src/data/movieRepository';

export const metadata: Metadata = { title: '영화 선택' };
export const dynamic = 'force-dynamic';

export default function MoviesPage() {
  const movies = movieRepository.list();

  return (
    <main>
      <h1>영화 선택</h1>
      <p className="notice" role="note">
        ⚠️ 검증용 시드 데이터의 영화 {movies.length}편입니다. 사양 값은 항목별 출처·확인일과 함께
        표시되며, 미검증 항목은 추천 시 감점·불확실성으로 반영됩니다.
      </p>
      {movies.length === 0 ? (
        <div className="card">
          <h3>영화 데이터가 없습니다</h3>
          <p className="sub">
            터미널에서 <code>npm run db:seed</code>를 실행해 시드 데이터를 생성해 주세요.
          </p>
        </div>
      ) : (
        movies.map((m) => <MovieCard key={m.id} movie={m} />)
      )}
    </main>
  );
}
