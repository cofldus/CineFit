import Link from 'next/link';
import { TrustLegend } from './TrustLegend';

/** §4-E — 홈의 마지막 섹션. 밝은 중성 배경으로 다크 히어로·다크 판단 섹션과 번갈아 리듬을
 * 만든다(홈 전체 다크→라이트→다크→라이트). */
export function FinalRecommendationCTA() {
  return (
    <section className="bg-home-light py-16">
      <div className="mx-auto max-w-[1360px] px-5 sm:px-8">
        <p className="max-w-xl font-display text-2xl font-bold leading-[1.15] tracking-[-0.03em] text-home-light-ink sm:text-3xl">
          추천 이유뿐 아니라 아쉬운 점과 확인이 필요한 정보도 함께 보여드립니다.
        </p>

        <div className="mt-8">
          <TrustLegend />
        </div>

        <Link
          href="/movies"
          className="mt-10 inline-flex min-h-12 items-center justify-center rounded-full bg-home-brand px-7 text-base font-semibold text-white transition-colors hover:bg-home-brand-hover"
        >
          보고 싶은 영화를 선택해 보세요
        </Link>
      </div>
    </section>
  );
}
