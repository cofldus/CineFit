import Link from 'next/link';
import { DbNotSeededError } from '../src/data/db';
import { movieRepository } from '../src/data/movieRepository';
import type { MovieWithSpecs } from '../src/domain/recommendation/types';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  let movies: MovieWithSpecs[] = [];
  let dbMissing = false;
  try {
    movies = movieRepository.list();
  } catch (e) {
    if (e instanceof DbNotSeededError) dbMissing = true;
    else throw e;
  }

  return (
    <main>
      <h1>
        영화에 <em style={{ color: 'var(--primary)', fontStyle: 'normal' }}>딱 맞는</em> 상영관
      </h1>
      <p>
        “이 영화를 내가 갈 수 있는 상영관 중 어디에서 보는 게 가장 만족스러울까?” — CineFit은 단순
        평점이 아니라 <strong>이유·단점·데이터 신뢰도까지 설명하는</strong> 상영관 추천을 만듭니다.
      </p>
      <p className="notice" role="note">
        ⚠️ 현재는 기술 검증(첫 마일스톤) 버전입니다. 회차·가격은 <strong>검증용 합성 데이터</strong>
        이며 실제 상영 정보가 아닙니다. 상영관 사양은 조사 자료 기반이며 항목별 출처·확인일을 함께
        표시합니다.
      </p>

      {dbMissing ? (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>데이터베이스가 아직 없습니다</h3>
          <p className="sub">
            터미널에서 <code>npm run db:seed</code>를 실행한 뒤 새로고침해 주세요.
          </p>
        </div>
      ) : (
        <>
          <section className="card" aria-label="추천 가능한 영화">
            <h3 style={{ marginTop: 0 }}>지금 추천받을 수 있는 영화</h3>
            <ul className="plain">
              {movies.map((m) => (
                <li key={m.id}>
                  <Link href={`/recommend/${m.id}`}>
                    {m.title} <span className="sub">({m.releaseYear})</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
          <Link href="/movies" className="btn btn-primary btn-block">
            추천 시작하기
          </Link>
        </>
      )}
    </main>
  );
}
