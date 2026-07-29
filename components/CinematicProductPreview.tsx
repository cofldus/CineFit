// 히어로 우측 오브제 — 실사 극장 사진 대신, 서로 다른 화면비 프레임 3장이 겹쳐 하나의 추천
// 카드로 모이는 과정을 CSS만으로 표현한다. "Modern Film Journal" 콘셉트에 맞춰 각 프레임을
// 인화지 크롭 마크(사진 편집 시 잘라낼 위치를 표시하는 L자 모서리 표식)와 세로로 흐르는
// 필름 캡션으로 감싸, 장식적 사각형이 아니라 "편집실에서 실제로 다루는 인화물"처럼 보이게
// 한다. 무거운 애니메이션 라이브러리 없이 순수 CSS transform만 쓰고,
// prefers-reduced-motion에서는 전역 규칙(globals.css)이 transition을 끈다.
function CropMarks({ className = '' }: { className?: string }) {
  return (
    <>
      <span aria-hidden className={`absolute h-3 w-3 border-l border-t border-home-ice/50 ${className}`} />
    </>
  );
}

export function CinematicProductPreview({ className = '' }: { className?: string }) {
  return (
    <div className={`relative ${className}`} aria-hidden>
      {/* 빛 번짐 — 구성 전체에 깊이감을 준다(장식적 blur 아님, 낮은 opacity radial) */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[120%] w-[120%] -translate-x-1/2 -translate-y-1/2"
        style={{ background: 'radial-gradient(ellipse, rgba(58,95,217,0.28) 0%, transparent 65%)' }}
      />
      <div className="relative mx-auto aspect-[4/5] w-full max-w-lg lg:max-w-none">
        {/* 배경 프레임 — 2.39:1 시네마스코프, 가장 뒤 */}
        <div
          className="absolute left-[4%] top-[4%] w-[88%] -rotate-[9deg] border border-white/20 bg-white/[0.05]"
          style={{ aspectRatio: '2.39 / 1' }}
        >
          <span
            aria-hidden
            className="absolute -left-5 top-1/2 hidden -translate-y-1/2 -rotate-90 font-wanted text-[10px] tracking-[0.24em] text-home-navy-ink-muted/70 lg:block"
          >
            SCOPE 2.39:1
          </span>
        </div>

        {/* 중간 프레임 — 1.85:1 플랫 */}
        <div
          className="absolute left-[13%] top-[27%] w-[78%] rotate-[5deg] border border-white/25 bg-white/[0.07]"
          style={{ aspectRatio: '1.85 / 1' }}
        >
          <span
            aria-hidden
            className="absolute -left-5 top-1/2 hidden -translate-y-1/2 -rotate-90 font-wanted text-[10px] tracking-[0.24em] text-home-navy-ink-muted/70 lg:block"
          >
            FLAT 1.85:1
          </span>
        </div>

        {/* 전면 카드 — 데이터가 모여 완성된 추천 결과. 인화지 크롭 마크 네 귀퉁이로
            "편집 중인 실물"이라는 인상을 더한다 */}
        <div className="absolute left-[9%] top-[51%] w-[82%] -rotate-[3deg] overflow-hidden border border-home-brand/50 bg-home-navy-raised p-5 shadow-[0_28px_64px_rgba(0,0,0,0.55)]">
          <CropMarks className="left-1.5 top-1.5" />
          <CropMarks className="right-1.5 top-1.5 rotate-90" />
          <CropMarks className="bottom-1.5 left-1.5 -rotate-90" />
          <CropMarks className="bottom-1.5 right-1.5 rotate-180" />

          <span className="absolute -bottom-3 -right-1 font-wanted text-[64px] font-extrabold leading-none text-white/[0.07]">
            96
          </span>
          <div className="relative flex items-center justify-between">
            <span className="font-wanted text-[11px] font-medium tracking-[0.16em] text-home-ice">일치도 96%</span>
            <span className="h-1.5 w-1.5 rounded-full bg-home-brand" />
          </div>
          <p className="relative mt-3 font-wanted text-base font-bold tracking-[-0.02em] text-home-navy-ink">
            CGV 용산아이파크몰 IMAX관
          </p>
          <div className="relative mt-3 flex items-center gap-3 font-wanted text-[11px] text-home-navy-ink-muted">
            <span>IMAX</span>
            <span>·</span>
            <span>이동 24분</span>
            <span>·</span>
            <span>30,000원</span>
          </div>
        </div>
      </div>
    </div>
  );
}
