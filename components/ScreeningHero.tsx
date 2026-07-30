import Link from 'next/link';
import { IconArrowRight, IconSeat, IconTransit } from './Icon';

// 실제 특정 상영관을 가리키지 않는, "CineFit이 무엇을 비교하는지" 보여주는 예시 흐름 —
// 화면비·포맷·좌석·이동시간은 전부 실제 서비스가 다루는 항목이고 숫자는 대표값일 뿐,
// 특정 영화·상영관·회차를 지어낸 것이 아니다.
const FLOW = [
  { kind: 'frame' as const, ratio: 1.43, caption: '1.43:1' },
  { kind: 'text' as const, label: 'IMAX', caption: '포맷' },
  { kind: 'icon' as const, Icon: IconSeat, label: '중앙 좌석' },
  { kind: 'icon' as const, Icon: IconTransit, label: '이동 24분' },
];

/**
 * 홈 히어로 — 데스크톱에서 헤드라인 하나만 중앙에 덩그러니 있고 위아래 여백이 과도하다는
 * 피드백. 오른쪽에 화면비→포맷→좌석→이동시간으로 이어지는 예시 흐름을 배치해 "무엇을
 * 비교하는 서비스인지"를 첫 화면에서 그래픽으로 보여준다. 아주 옅은 크림슨/아이시블루
 * 광원을 배경에 깔아 완전한 단색 검정처럼 보이지 않게 했다(네온처럼 보이지 않도록 넓고
 * 흐리게). 모바일에서는 기존과 동일하게 헤드라인·CTA만 보인다.
 */
export function ScreeningHero() {
  return (
    <section className="enter-1 relative overflow-hidden bg-bg px-5 pb-6 pt-8 sm:px-10 sm:pb-10 sm:pt-14">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(60% 50% at 50% 0%, rgba(240,68,100,0.10) 0%, transparent 70%), ' +
            'radial-gradient(55% 55% at 100% 100%, rgba(124,167,255,0.09) 0%, transparent 70%)',
        }}
      />
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
              className="group inline-flex min-h-12 items-center justify-center gap-1.5 rounded-card bg-primary-strong px-8 text-base font-semibold text-white transition-all hover:bg-primary-strong-hover hover:shadow-glow-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-strong active:scale-[0.98]"
            >
              어디서 볼지 찾아보기
              <IconArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>

        <div className="mt-10 hidden sm:block">
          <p className="m-0 text-sm font-semibold text-text-sub">CineFit이 비교하는 흐름</p>
          <div className="mt-4 flex items-center gap-2.5">
            {FLOW.map((step, i) => (
              <div key={i} className="flex items-center gap-2.5">
                {i > 0 ? <IconArrowRight className="h-4 w-4 shrink-0 text-text-tertiary" /> : null}
                <div className="flex flex-col items-center gap-1.5">
                  {step.kind === 'frame' ? (
                    <div
                      aria-hidden
                      className="rounded-[3px] border border-accent/50 bg-bg"
                      style={{ height: '28px', width: 'auto', aspectRatio: `${step.ratio} / 1` }}
                    />
                  ) : step.kind === 'text' ? (
                    <span className="inline-flex items-center rounded-full border border-accent/40 px-2.5 py-0.5 text-xs font-semibold text-accent">
                      {step.label}
                    </span>
                  ) : (
                    <step.Icon className="h-5 w-5 text-text-sub" />
                  )}
                  <span className="whitespace-nowrap text-[13px] font-medium text-text-sub">
                    {'caption' in step ? step.caption : step.label}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
