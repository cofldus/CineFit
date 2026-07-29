import { EditorialDecisionSection } from '../components/EditorialDecisionSection';
import { FeaturedMovieGrid } from '../components/FeaturedMovieGrid';
import { FinalRecommendationCTA } from '../components/FinalRecommendationCTA';
import { HeroRecommendationIntro } from '../components/HeroRecommendationIntro';
import { MarketingHeader } from '../components/MarketingHeader';
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
    <main className="max-w-none p-0">
      <MarketingHeader />
      <HeroRecommendationIntro />
      {dbMissing ? (
        <section className="bg-home-light py-16">
          <div className="mx-auto max-w-[1360px] px-5 sm:px-8">
            <h2 className="m-0 font-display text-xl font-bold text-home-light-ink">아직 준비된 데이터가 없어요</h2>
            <p className="mt-2 text-sm text-home-light-ink-muted">
              터미널에서{' '}
              <code className="bg-black/5 px-1.5 py-0.5 font-label text-[13px]">npm run db:seed</code>를 실행한 뒤
              새로고침해 주세요.
            </p>
          </div>
        </section>
      ) : (
        <FeaturedMovieGrid movies={movies} />
      )}
      <EditorialDecisionSection />
      <FinalRecommendationCTA />
    </main>
  );
}
