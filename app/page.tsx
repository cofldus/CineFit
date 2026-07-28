import Link from 'next/link';
import { Notice } from '../components/Notice';
import { DbNotSeededError } from '../src/data/db';
import { movieRepository } from '../src/data/movieRepository';
import type { MovieWithSpecs } from '../src/domain/recommendation/types';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  let movies: MovieWithSpecs[] = [];
  let dbMissing = false;
  try {
    movies = await movieRepository.list();
  } catch (e) {
    if (e instanceof DbNotSeededError) dbMissing = true;
    else throw e;
  }

  return (
    <main className="mx-auto max-w-xl px-4 pb-24 pt-6">
      <h1 className="text-[28px] font-extrabold leading-tight text-text">
        영화에 <span className="text-primary">딱 맞는</span> 상영관을 찾아드려요
      </h1>
      <p className="mt-3 leading-relaxed text-text-sub">
        평점 하나만 보고 고르지 마세요. 어디가 좋은지, 뭐가 아쉬운지, 그 정보를 얼마나 믿을 수
        있는지까지 이유와 함께 알려드려요.
      </p>

      <div className="mt-4">
        <Notice tone="info">
          지금은 테스트 중인 베타예요. 회차·가격은 <strong className="font-semibold">실제가 아닌 테스트용 데이터</strong>이고, 상영관 정보는 조사한 자료를 바탕으로 출처와 확인 날짜를 함께 보여드려요.
        </Notice>
      </div>

      {dbMissing ? (
        <div className="mt-6 rounded-card-lg border border-border bg-surface p-5">
          <h3 className="m-0 text-lg font-bold text-text">아직 준비된 데이터가 없어요</h3>
          <p className="mt-2 text-sm text-text-sub">
            터미널에서{' '}
            <code className="rounded-md bg-bg px-1.5 py-0.5 text-[13px]">npm run db:seed</code>를
            실행한 뒤 새로고침해 주세요.
          </p>
        </div>
      ) : (
        <>
          <section aria-label="추천 가능한 영화" className="mt-7">
            <h2 className="text-base font-bold text-text">지금 추천받을 수 있는 영화</h2>
            <ul className="mt-3 flex list-none flex-col gap-2 p-0">
              {movies.map((m) => (
                <li key={m.id}>
                  <Link
                    href={`/recommend/${m.id}`}
                    className="flex min-h-14 items-center justify-between rounded-card-lg border border-border bg-surface px-4 py-3 text-text transition-colors hover:border-primary/60 hover:bg-surface-raised"
                  >
                    <span className="font-medium">
                      {m.title}{' '}
                      {m.releaseYear ? <span className="text-text-sub">({m.releaseYear})</span> : null}
                    </span>
                    <span aria-hidden className="text-text-sub">
                      →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
          <Link
            href="/movies"
            className="mt-6 flex min-h-11 w-full items-center justify-center rounded-card bg-primary px-5 text-base font-semibold text-white transition-colors hover:bg-primary-hover"
          >
            추천 시작하기
          </Link>
        </>
      )}
    </main>
  );
}
