import { HomeClosing } from '../components/HomeClosing';
import { MarketingHeader } from '../components/MarketingHeader';
import { ScreeningHero } from '../components/ScreeningHero';
import { ScreeningRoomGrid } from '../components/ScreeningRoomGrid';
import { DbNotSeededError } from '../src/data/db';
import { movieRepository } from '../src/data/movieRepository';
import type { MovieWithSpecs } from '../src/domain/recommendation/types';

export const dynamic = 'force-dynamic';

// "The Screening Room" — Design Lab에서 검증한 5개 시안 중 선택된 콘셉트를 실데이터로
// 구현했다(design-lab/art-directions 브랜치의 /design-lab/e). 온보딩 3문항 폼은 홈에서
// 뺐다 — localStorage 읽기/쓰기 유틸과 recommend 폼 기본값 연동 로직은 그대로 남아 있지만,
// 지금은 이 폼을 채울 진입점이 홈에 없다(추후 recommend 플로우 초입으로 옮기는 별도 작업).
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
    <main className="max-w-none p-0">
      <MarketingHeader />
      <ScreeningHero />
      {dbMissing ? (
        <section className="bg-cinema-black px-5 py-16 sm:px-10">
          <div className="mx-auto max-w-md text-center">
            <h2 className="m-0 font-wanted text-xl font-bold text-cinema-ink">아직 준비된 데이터가 없어요</h2>
            <p className="mt-2 text-sm text-cinema-ink-muted">
              터미널에서{' '}
              <code className="bg-white/10 px-1.5 py-0.5 font-mono text-[13px] text-cinema-ink">
                npm run db:seed
              </code>
              를 실행한 뒤 새로고침해 주세요.
            </p>
          </div>
        </section>
      ) : (
        <ScreeningRoomGrid movies={movies} />
      )}
      <HomeClosing />
    </main>
  );
}
