import Link from 'next/link';
import { CinematicProductPreview } from './CinematicProductPreview';
import { IconArrowRight } from './Icon';

// 히어로 — "Modern Film Journal" 콘셉트의 핵심. 12-col을 6/6 대칭으로 나누는 대신 텍스트를
// 7-col, 오브제를 6-col에 겹치게 배치해(교차 1-col) 비대칭 잡지 스프레드처럼 구성한다.
// 오브제는 데스크톱에서 컨테이너 오른쪽 여백 밖으로 살짝 흘러나가(bleed) 페이지 가장자리에
// 눌린 느낌을 없앤다. 세로 스파인 라벨은 잡지 표지의 발행 표기를 흉내 낸 장식 요소로,
// 텍스트 판독에는 관여하지 않는 aria-hidden 요소다. 헤드라인 글자 크기는 1차 라운드
// (최대 52px)보다 훨씬 크게(최대 104px) 키워 "인쇄 포스터" 같은 스케일 대비를 만든다.
export function HeroRecommendationIntro() {
  return (
    <section className="bg-grain relative overflow-hidden bg-home-navy">
      {/* 프로젝터 빛 번짐 — 장식이 아니라 다크 섹션에 깊이감을 주는 최소한의 atmosphere */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-1/4 -top-1/4 h-[70%] w-[70%]"
        style={{ background: 'radial-gradient(ellipse, rgba(58,95,217,0.18) 0%, transparent 70%)' }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute left-4 top-1/2 hidden -translate-y-1/2 -rotate-90 font-wanted text-[11px] font-medium tracking-[0.32em] text-home-navy-ink-muted/50 lg:block"
      >
        CINEFIT — VOL. 01
      </span>

      <div className="relative mx-auto grid max-w-[1360px] gap-x-6 px-5 pb-16 pt-12 sm:px-8 lg:grid-cols-12 lg:px-16 lg:pb-24 lg:pt-20">
        <div className="lg:col-span-7">
          <span className="inline-flex items-center gap-1.5 border border-white/15 px-2.5 py-1 font-wanted text-[11px] font-medium tracking-[0.08em] text-home-navy-ink-muted">
            테스트 서비스 · BETA
          </span>
          {/* break-keep(word-break: keep-all) 없이는 큰 화면(lg 이상)에서 "할까요?"가
              "할까"/"요?"로 음절 단위로 쪼개져 줄바꿈된다 — 실제 캡처에서 발견한 버그. 한글은
              공백 단위(어절)로만 줄이 바뀌어야 자연스럽다. */}
          <h1 className="mt-6 break-keep font-wanted text-[44px] font-extrabold leading-[0.98] tracking-[-0.045em] text-home-navy-ink sm:text-[64px] lg:text-[80px] xl:text-[100px]">
            이 영화,
            <br />
            어디서 봐야 할까요?
          </h1>
          <div className="mt-8 flex flex-col gap-8 lg:mt-12 lg:flex-row lg:items-end lg:justify-between">
            <p className="max-w-sm text-base leading-[1.65] tracking-[-0.015em] text-home-navy-ink-muted sm:text-lg">
              화면비, 사운드, 좌석, 이동 시간과 가격을 비교해 지금 볼 수 있는 가장 좋은 선택을
              찾아드립니다.
            </p>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
              <Link
                href="/movies"
                className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-home-brand px-7 text-base font-semibold text-white transition-[background-color,gap] duration-200 hover:gap-3 hover:bg-home-brand-hover"
              >
                영화 선택하기
                <IconArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="#decision"
                className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-home-navy-ink transition-colors hover:text-home-ice"
              >
                추천 기준 살펴보기
                <IconArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>

        <div className="relative mt-14 lg:col-span-6 lg:col-start-7 lg:-mt-4 lg:-mr-10 xl:-mr-20">
          <CinematicProductPreview />
        </div>
      </div>
    </section>
  );
}
