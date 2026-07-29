import Link from 'next/link';
import { CinematicProductPreview } from './CinematicProductPreview';
import { IconArrowRight } from './Icon';

// 히어로 — 딥 네이비 시네마틱 섹션. 텍스트(제목·설명·CTA 2개·베타 표시)와
// CinematicProductPreview가 12-column 그리드 안에서 한 구도를 이룬다(§4-B).
export function HeroRecommendationIntro() {
  return (
    <section className="relative overflow-hidden bg-home-navy">
      {/* 프로젝터 빛 번짐 — DESIGN.md "Projector Light" 원칙, 장식이 아니라 다크 섹션에
          깊이감을 주는 최소한의 atmosphere(opacity 낮게, blur 없이 순수 radial-gradient) */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-1/4 -top-1/4 h-[70%] w-[70%]"
        style={{ background: 'radial-gradient(ellipse, rgba(58,95,217,0.22) 0%, transparent 70%)' }}
      />
      <div className="relative mx-auto grid max-w-[1360px] gap-10 px-5 pb-14 pt-10 sm:px-8 lg:min-h-[680px] lg:grid-cols-12 lg:items-center lg:gap-8 lg:py-16">
        <div className="lg:col-span-6">
          <span className="inline-flex items-center gap-1.5 border border-white/15 px-2.5 py-1 font-label text-[11px] font-medium tracking-[0.08em] text-home-navy-ink-muted">
            테스트 서비스 · BETA
          </span>
          <h1 className="mt-5 font-display text-[36px] font-extrabold leading-[1.05] tracking-[-0.04em] text-home-navy-ink sm:text-[44px] lg:text-[52px]">
            이 영화,
            <br />
            어디서 봐야 할까요?
          </h1>
          <p className="mt-5 max-w-md text-base leading-[1.65] tracking-[-0.015em] text-home-navy-ink-muted sm:text-lg">
            화면비, 사운드, 좌석, 이동 시간과 가격을 비교해 지금 볼 수 있는 가장 좋은 선택을
            찾아드립니다.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
            <Link
              href="/movies"
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-home-brand px-7 text-base font-semibold text-white transition-colors hover:bg-home-brand-hover"
            >
              영화 선택하기
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
        <CinematicProductPreview className="lg:col-span-6" />
      </div>
    </section>
  );
}
