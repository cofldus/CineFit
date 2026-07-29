import Link from 'next/link';
import { IconEdit, IconFilm, IconLightbulb } from '../components/Icon';
import { EditorialMovieCard } from '../components/EditorialMovieCard';
import { EditorialPage } from '../components/EditorialPage';
import { OnboardingCard } from '../components/OnboardingCard';
import { HeroVisual } from '../components/ScreenArt';
import { DbNotSeededError } from '../src/data/db';
import { featureFlagRepository } from '../src/data/featureFlagRepository';
import { movieRepository } from '../src/data/movieRepository';
import type { MovieWithSpecs } from '../src/domain/recommendation/types';

export const dynamic = 'force-dynamic';

const STEPS = [
  { Icon: IconFilm, title: '영화 선택', desc: '지금 CineFit이 다루는 영화 중 하나를 골라요.' },
  { Icon: IconEdit, title: '조건 입력', desc: '날짜·이동 시간·가격·우선순위를 입력해요. 기본값 그대로도 괜찮아요.' },
  { Icon: IconLightbulb, title: '이유 있는 추천', desc: '점수와 함께 장점·단점·확인이 더 필요한 부분까지 알려드려요.' },
] as const;

const COMPARE_POINTS = [
  { label: '화면비·촬영 포맷', detail: '영화 원본 규격과 상영관 스크린의 궁합' },
  { label: '특별관 인증', detail: 'IMAX·Dolby Cinema 등 공식 인증 여부' },
  { label: '목적별 좌석 구역', detail: '몰입·자막 가독·멀미 완화 등' },
  { label: '이동 시간·가격', detail: '실제로 갈 수 있는 거리인지' },
  { label: '정보 신선도', detail: '언제, 어떤 출처로 확인됐는지' },
];

export default async function HomePage() {
  let movies: MovieWithSpecs[] = [];
  let dbMissing = false;
  let onboardingEnabled = false;
  try {
    movies = await movieRepository.list();
    onboardingEnabled = await featureFlagRepository.isEnabled('onboarding');
  } catch (e) {
    if (e instanceof DbNotSeededError) dbMissing = true;
    else throw e;
  }

  return (
    <EditorialPage className="mx-auto max-w-wide px-4 pb-24 pt-8 sm:pt-12">
      <section className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-12">
        <div className="max-w-content">
          <p className="m-0 font-label text-xs font-medium uppercase tracking-[0.12em] text-ed-gold">Cinematic Recommendation</p>
          <h1 className="mt-2 font-display text-[34px] font-extrabold leading-[1.02] tracking-[-0.045em] text-ed-ink sm:text-5xl">
            영화에 딱 맞는 <span className="text-ed-gold">상영관</span>을 찾아드려요
          </h1>
          <p className="mt-4 max-w-md leading-[1.65] tracking-[-0.015em] text-ed-ink-muted">
            평점 하나만 보고 고르지 마세요. 어디가 좋은지, 뭐가 아쉬운지, 그 정보를 얼마나 믿을 수
            있는지까지 이유와 함께 알려드려요.
          </p>

          {!dbMissing ? (
            <Link
              href="/movies"
              className="mt-7 flex min-h-12 w-full items-center justify-center bg-ed-ink px-6 text-base font-semibold text-ed-canvas transition-opacity hover:opacity-85 sm:w-auto"
            >
              추천 시작하기
            </Link>
          ) : null}
          <p className="mt-3 max-w-md text-xs leading-[1.65] tracking-[-0.015em] text-ed-ink-muted">
            지금은 테스트 중인 서비스예요 — 회차·가격은 실제가 아닌 테스트용 데이터이고, 상영관
            정보는 조사한 자료를 바탕으로 출처와 확인 날짜를 함께 보여드려요.
          </p>

          {onboardingEnabled && (
            <div className="mt-8 max-w-md border-t border-ed-hairline pt-6">
              <OnboardingCard />
            </div>
          )}
        </div>
        <HeroVisual className="hidden h-auto w-full lg:block" />
      </section>

      {dbMissing ? (
        <div className="mt-10 max-w-content border border-ed-hairline bg-ed-surface p-5">
          <h3 className="m-0 font-display text-lg font-bold tracking-[-0.035em] leading-[1.1] text-ed-ink">아직 준비된 데이터가 없어요</h3>
          <p className="mt-2 text-sm text-ed-ink-muted">
            터미널에서{' '}
            <code className="bg-ed-surface-sunken px-1.5 py-0.5 font-label text-[13px]">npm run db:seed</code>를
            실행한 뒤 새로고침해 주세요.
          </p>
        </div>
      ) : (
        <section aria-label="추천 가능한 영화" className="mt-14">
          <div className="flex items-baseline justify-between border-b border-ed-hairline pb-3">
            <h2 className="m-0 font-display text-lg font-bold tracking-[-0.035em] leading-[1.1] text-ed-ink">지금 추천받을 수 있는 영화</h2>
            <span className="font-label text-xs font-medium tracking-[0.1em] text-ed-ink-muted">
              01 — {String(movies.length).padStart(2, '0')}
            </span>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {movies.map((m) => (
              <EditorialMovieCard key={m.id} movie={m} variant="compact" />
            ))}
          </div>
        </section>
      )}

      <div className="mt-16 grid gap-10 lg:grid-cols-2 lg:gap-16">
        <section aria-label="이용 흐름">
          <h2 className="font-label text-xs font-medium uppercase tracking-[0.12em] text-ed-ink-muted">How it works</h2>
          <ol className="mt-4 flex list-none flex-col gap-5 p-0">
            {STEPS.map((s, i) => (
              <li key={s.title} className="flex gap-4 border-t border-ed-hairline pt-4 first:border-t-0 first:pt-0">
                <span className="font-label text-2xl font-medium text-ed-gold">{String(i + 1).padStart(2, '0')}</span>
                <div>
                  <h3 className="m-0 font-display text-base font-bold tracking-[-0.035em] leading-[1.1] text-ed-ink">{s.title}</h3>
                  <p className="m-0 mt-1 text-sm leading-[1.65] tracking-[-0.015em] text-ed-ink-muted">{s.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section aria-label="비교 요소">
          <h2 className="font-label text-xs font-medium uppercase tracking-[0.12em] text-ed-ink-muted">CineFit compares</h2>
          <dl className="m-0 mt-4 flex flex-col gap-3">
            {COMPARE_POINTS.map((p) => (
              <div key={p.label} className="flex items-baseline justify-between gap-4 border-t border-ed-hairline pt-3 first:border-t-0 first:pt-0">
                <dt className="font-display text-sm font-bold tracking-[-0.03em] text-ed-ink">{p.label}</dt>
                <dd className="m-0 text-right text-xs leading-[1.65] tracking-[-0.015em] text-ed-ink-muted">{p.detail}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </EditorialPage>
  );
}
