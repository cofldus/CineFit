import { HomeClosing } from '../components/HomeClosing';
import { NowShowing } from '../components/NowShowing';
import { ScreeningHero } from '../components/ScreeningHero';
import { DbNotSeededError } from '../src/data/db';
import { movieRepository } from '../src/data/movieRepository';
import type { MovieWithSpecs } from '../src/domain/recommendation/types';

export const dynamic = 'force-dynamic';

// 홈 — 헤드라인+설명+CTA(ScreeningHero) → 지금 볼 수 있는 영화(NowShowing) → 비교 기준+
// 마지막 CTA(HomeClosing). MarketingHeader는 사용자 화면 전체의 공통 헤더라
// app/layout.tsx에서 렌더한다(여기서 다시 렌더하지 않음). 온보딩 3문항 폼은 홈에서 뺐다 —
// localStorage 읽기/쓰기 유틸과 recommend 폼 기본값 연동 로직은 그대로 남아 있지만, 지금은
// 이 폼을 채울 진입점이 홈에 없다(추후 recommend 플로우 초입으로 옮기는 별도 작업).
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
    <main className="cinema-scope min-h-dvh max-w-none bg-bg p-0">
      <ScreeningHero />
      {dbMissing ? (
        <section className="px-5 py-16 sm:px-10">
          <div className="mx-auto max-w-md text-center">
            <h2 className="m-0 text-xl font-bold text-text">아직 준비된 데이터가 없어요</h2>
            <p className="mt-2 text-sm text-text-sub">
              터미널에서{' '}
              <code className="bg-surface px-1.5 py-0.5 font-mono text-[13px] text-text">npm run db:seed</code>를
              실행한 뒤 새로고침해 주세요.
            </p>
          </div>
        </section>
      ) : (
        <NowShowing movies={movies} />
      )}
      <HomeClosing />
    </main>
  );
}
