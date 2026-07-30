import Link from 'next/link';

const STEPS = [
  { n: '1', label: '영화 선택', detail: '지금 상영 중인 영화 중 하나를 골라요' },
  { n: '2', label: '조건 입력', detail: '이동 시간·가격·선호 포맷을 알려줘요' },
  { n: '3', label: '상영관 추천 확인', detail: '이유와 함께 가장 잘 맞는 곳을 보여줘요' },
] as const;

/**
 * 홈 히어로 — 데스크톱에서 헤드라인 하나만 중앙에 덩그러니 있고 위아래 여백이 과도하다는
 * 피드백. 오른쪽에 영화 카드를 또 넣는 대신(아래 NowShowing과 중복) 실제 서비스 흐름을
 * 보여주는 3단계 안내를 배치했다 — 데이터 중복 없이 여백을 채우면서 "무엇을 하는 서비스인지"
 * 첫 화면에서 바로 드러나게 한다. 모바일에서는 기존과 동일하게 헤드라인·CTA만 보인다.
 */
export function ScreeningHero() {
  return (
    <section className="bg-bg px-5 pb-6 pt-8 sm:px-10 sm:pb-10 sm:pt-14">
      <div className="mx-auto max-w-wide sm:grid sm:grid-cols-2 sm:items-center sm:gap-12 lg:gap-20">
        <div className="text-center sm:text-left">
          <h1 className="m-0 break-keep font-wanted text-[8vw] font-extrabold leading-[1.2] tracking-[-0.02em] text-text sm:text-4xl lg:text-5xl">
            이 영화, <span className="text-primary-strong">어디서</span> 봐야 할까요?
          </h1>
          <p className="mx-auto mt-3 max-w-md break-keep text-[15px] leading-[1.6] text-text-sub sm:mx-0">
            화면비·사운드·좌석·이동시간·가격을 비교해 지금 조건에 가장 맞는 상영관을 추천해요.
          </p>
          <div className="mt-6 flex justify-center sm:justify-start">
            <Link
              href="/movies"
              className="inline-flex min-h-12 items-center justify-center rounded-card bg-primary-strong px-8 text-base font-semibold text-white transition-colors hover:bg-primary-strong-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-strong"
            >
              어디서 볼지 찾아보기
            </Link>
          </div>
        </div>

        <div className="mt-10 hidden sm:block">
          <ol className="m-0 flex list-none flex-col gap-5 p-0">
            {STEPS.map((s) => (
              <li key={s.n} className="flex items-start gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border text-sm font-bold text-text">
                  {s.n}
                </span>
                <div>
                  <p className="m-0 text-[15px] font-bold text-text">{s.label}</p>
                  <p className="m-0 mt-0.5 text-sm text-text-sub">{s.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
