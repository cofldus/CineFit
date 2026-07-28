import Link from 'next/link';
import { IconChevronRight, IconEdit, IconFilm, IconLightbulb } from '../components/Icon';
import { Notice } from '../components/Notice';
import { HeroVisual } from '../components/ScreenArt';
import { DbNotSeededError } from '../src/data/db';
import { movieRepository } from '../src/data/movieRepository';
import type { MovieWithSpecs } from '../src/domain/recommendation/types';

export const dynamic = 'force-dynamic';

const STEPS = [
  { Icon: IconFilm, title: '영화 선택', desc: '지금 CineFit이 다루는 영화 중 하나를 골라요.' },
  { Icon: IconEdit, title: '조건 입력', desc: '날짜·이동 시간·가격·우선순위를 입력해요. 기본값 그대로도 괜찮아요.' },
  { Icon: IconLightbulb, title: '이유 있는 추천', desc: '점수와 함께 장점·단점·확인이 더 필요한 부분까지 알려드려요.' },
] as const;

const COMPARE_POINTS = [
  '영화의 화면비·촬영 포맷과 상영관 사양의 궁합',
  'IMAX·Dolby Cinema 등 특별관 인증 여부',
  '목적별 좌석 구역(몰입/자막 가독/멀미 완화 등)',
  '이동 시간과 가격',
  '이 모든 정보가 얼마나 최근에, 어떤 출처로 확인됐는지',
];

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
    <main className="mx-auto max-w-wide px-4 pb-24 pt-6">
      <section className="grid items-center gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-10">
        <div className="max-w-content">
          <h1 className="text-[28px] font-extrabold leading-tight text-text lg:text-4xl">
            영화에 <span className="text-primary">딱 맞는</span> 상영관을 찾아드려요
          </h1>
          <p className="mt-3 leading-relaxed text-text-sub lg:text-lg">
            평점 하나만 보고 고르지 마세요. 어디가 좋은지, 뭐가 아쉬운지, 그 정보를 얼마나 믿을 수
            있는지까지 이유와 함께 알려드려요.
          </p>

          <div className="mt-4">
            <Notice tone="info">
              지금은 테스트 중인 베타예요. 회차·가격은{' '}
              <strong className="font-semibold">실제가 아닌 테스트용 데이터</strong>이고, 상영관
              정보는 조사한 자료를 바탕으로 출처와 확인 날짜를 함께 보여드려요.
            </Notice>
          </div>

          {!dbMissing ? (
            <Link
              href="/movies"
              className="mt-5 flex min-h-11 w-full items-center justify-center rounded-card bg-primary-strong px-5 text-base font-semibold text-white transition-colors hover:bg-primary-strong-hover sm:w-auto"
            >
              추천 시작하기
            </Link>
          ) : null}
        </div>
        <HeroVisual className="hidden h-auto w-full text-primary lg:block" />
      </section>

      {dbMissing ? (
        <div className="mt-6 max-w-content rounded-card-lg border border-border bg-surface p-5">
          <h3 className="m-0 text-lg font-bold text-text">아직 준비된 데이터가 없어요</h3>
          <p className="mt-2 text-sm text-text-sub">
            터미널에서{' '}
            <code className="rounded-md bg-bg px-1.5 py-0.5 text-[13px]">npm run db:seed</code>를
            실행한 뒤 새로고침해 주세요.
          </p>
        </div>
      ) : (
        <section aria-label="추천 가능한 영화" className="mt-8 max-w-content">
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
                  <IconChevronRight className="h-4 w-4 text-text-sub" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-label="이용 흐름" className="mt-10 max-w-content">
        <h2 className="text-base font-bold text-text">이렇게 추천해 드려요</h2>
        <ol className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="rounded-card-lg border border-border bg-surface p-4">
              <div className="flex items-center gap-2 text-text-sub">
                <s.Icon className="h-5 w-5 text-primary" />
                <span className="text-xs font-semibold">STEP {i + 1}</span>
              </div>
              <h3 className="m-0 mt-2 text-[15px] font-bold text-text">{s.title}</h3>
              <p className="m-0 mt-1 text-sm text-text-sub">{s.desc}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-label="비교 요소" className="mt-8 max-w-content">
        <h2 className="text-base font-bold text-text">CineFit이 비교하는 것들</h2>
        <ul className="m-0 mt-3 flex list-none flex-col gap-2 p-0">
          {COMPARE_POINTS.map((p) => (
            <li key={p} className="flex items-start gap-2 text-sm text-text-sub">
              <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
              {p}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
