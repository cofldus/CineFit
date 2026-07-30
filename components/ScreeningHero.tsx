import Link from 'next/link';

/**
 * 홈 히어로 — 큰 베이지 그러데이션 "스크린"과 커튼·좌석 실루엣 장식을 전부 제거했다(피드백
 * #4: 모바일에서 빈 이미지처럼 보임). 이제 헤드라인·설명·CTA만으로 구성된 짧은 섹션이라
 * 390px 뷰포트 첫 화면에 헤드라인+CTA+영화 목록 첫 장이 함께 들어온다.
 */
export function ScreeningHero() {
  return (
    <section className="bg-bg px-5 pb-6 pt-8 text-center sm:px-10 sm:pb-8 sm:pt-12">
      <h1 className="m-0 break-keep font-wanted text-[8vw] font-extrabold leading-[1.2] tracking-[-0.02em] text-text sm:text-4xl lg:text-5xl">
        이 영화, <span className="text-primary-strong">어디서</span> 봐야 할까요?
      </h1>
      <p className="mx-auto mt-3 max-w-md break-keep text-[15px] leading-[1.6] text-text-sub">
        화면비·사운드·좌석·이동시간·가격을 비교해 지금 조건에 가장 맞는 상영관을 추천해요.
      </p>
      <div className="mt-6 flex justify-center">
        <Link
          href="/movies"
          className="inline-flex min-h-12 items-center justify-center rounded-card bg-primary-strong px-8 text-base font-semibold text-white transition-colors hover:bg-primary-strong-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-strong"
        >
          지금 비교 시작
        </Link>
      </div>
    </section>
  );
}
