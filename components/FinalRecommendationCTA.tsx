import Link from 'next/link';
import { IconArrowRight } from './Icon';
import { TrustLegend } from './TrustLegend';

/** 홈의 마지막 섹션 — 밝은 중성 배경으로 다크 히어로·다크 매니페스토와 번갈아 리듬을
 * 만든다. 선언 텍스트(7-col)와 신뢰도 콜로폰(5-col)을 좌우 비대칭으로 나눠, 신뢰도 안내가
 * 별도 목록이 아니라 브랜드 선언과 한 조판 안에서 짝을 이루는 것처럼 보이게 한다. */
export function FinalRecommendationCTA() {
  return (
    <section className="bg-home-light py-16 lg:py-24">
      <div className="mx-auto max-w-[1360px] px-5 sm:px-8 lg:px-16">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-7">
            <p className="break-keep font-wanted text-2xl font-bold leading-[1.15] tracking-[-0.03em] text-home-light-ink sm:text-4xl lg:max-w-lg">
              추천 이유뿐 아니라 아쉬운 점과 확인이 필요한 정보도 함께 보여드립니다.
            </p>
            <Link
              href="/movies"
              className="group mt-10 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-home-brand px-7 text-base font-semibold text-white transition-[background-color,gap] duration-200 hover:gap-3 hover:bg-home-brand-hover"
            >
              보고 싶은 영화를 선택해 보세요
              <IconArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
          </div>

          <div className="lg:col-span-5 lg:border-l lg:border-home-light-ink/10 lg:pl-10">
            <span className="font-wanted text-[11px] font-medium tracking-[0.1em] text-home-light-ink-muted">
              정보 신뢰도
            </span>
            <div className="mt-5">
              <TrustLegend />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
