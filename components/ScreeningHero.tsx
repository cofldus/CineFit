import Link from 'next/link';

// 히어로 — "영화 극장 스크린 생각나게, CGV 느낌" 피드백에서 나온 콘셉트. 문구는 스크린
// 위가 아니라 어두운 객석(전경)에 둔다 — 빛나는 스크린 위에 텍스트를 얹으면 배경마다 대비를
// 다시 계산해야 하는데, 스크린 자체는 조명 애니메이션 없이 고정된 순수 시각 오브젝트로만
// 두어 그 문제를 원천적으로 피한다. Design Lab 시안(E)의 scroll-reveal은 프로덕션에서는
// 빼기로 했다 — 같은 메커니즘으로 캡처 버그를 두 번 겪었고(§design-lab 커밋 기록 참고),
// 정적 렌더링이 가장 견고하다.
export function ScreeningHero() {
  return (
    <section className="relative overflow-hidden bg-cinema-black px-5 pb-4 pt-10 text-center sm:px-10 sm:pt-14">
      <h1 className="m-0 break-keep font-wanted text-[9vw] font-extrabold leading-[1.15] tracking-[-0.02em] text-cinema-ink sm:text-5xl lg:text-6xl">
        이 영화, <span className="text-cinema-red">어디서</span> 봐야 할까요?
      </h1>
      <p className="mx-auto mt-6 max-w-md break-keep text-base leading-[1.7] text-cinema-ink-muted">
        화면비, 사운드, 좌석, 이동 시간과 가격을 함께 비교해 지금 조건에 가장 맞는 상영관을
        추천합니다.
      </p>

      <div className="relative mx-auto mt-12 max-w-3xl">
        {/* 커튼 — 은은한 세로 주름(반복 그러데이션), 스크린 양옆을 감싼다 */}
        <div
          aria-hidden
          className="absolute -inset-x-6 inset-y-4 -z-10 opacity-70 sm:-inset-x-10"
          style={{
            background:
              'repeating-linear-gradient(90deg, #2a1216 0px, #2a1216 14px, #1a0c0e 14px, #1a0c0e 28px)',
          }}
        />
        {/* 스크린 — 순수한 빛의 오브젝트. 텍스트 없음 */}
        <div className="relative overflow-hidden" style={{ aspectRatio: '2.2 / 1' }}>
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse 80% 120% at 50% 30%, #fdf6ec 0%, #d8c9ad 45%, #4a3f2f 80%, #1a1512 100%)',
            }}
          />
        </div>
      </div>

      <div className="relative mt-10 flex justify-center">
        <Link
          href="/movies"
          className="inline-flex min-h-12 items-center justify-center rounded-sm bg-cinema-red px-8 text-base font-semibold text-white transition-colors hover:bg-cinema-red-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cinema-ink"
        >
          지금 비교 시작
        </Link>
      </div>

      {/* 좌석 실루엣 — 객석에서 스크린을 보는 시점임을 알려주는 최소한의 장치 */}
      <div aria-hidden className="relative mt-14 flex justify-center gap-1.5 px-4 sm:h-14">
        {Array.from({ length: 14 }).map((_, i) => (
          <span key={i} className="h-5 w-6 rounded-t-md bg-black/70 sm:h-7 sm:w-8" />
        ))}
      </div>
    </section>
  );
}
