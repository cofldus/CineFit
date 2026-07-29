// 히어로 우측 비주얼 — 실사 극장 사진 대신, 서로 다른 화면비 프레임 3장이 겹쳐 하나의 추천
// 카드로 모이는 과정을 CSS만으로 표현한다("화면비·사운드·좌석 데이터가 하나의 추천으로
// 모이는 추상 그래픽"). 무거운 애니메이션 라이브러리 없이 순수 CSS transform/transition만
// 쓰고, prefers-reduced-motion에서는 transition을 끈다(globals.css 전역 규칙).
export function CinematicProductPreview({ className = '' }: { className?: string }) {
  return (
    <div className={`relative ${className}`} aria-hidden>
      {/* 프레임들 뒤의 빛 번짐 — 구성 전체에 깊이감을 준다(장식적 blur 아님, 낮은 opacity radial) */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[120%] w-[120%] -translate-x-1/2 -translate-y-1/2"
        style={{ background: 'radial-gradient(ellipse, rgba(58,95,217,0.35) 0%, transparent 65%)' }}
      />
      <div className="relative mx-auto aspect-[4/5] w-full max-w-lg lg:max-w-none">
        {/* 배경 프레임 — 2.39:1 시네마스코프, 가장 뒤 */}
        <div
          className="absolute left-[6%] top-[6%] w-[92%] -rotate-6 border border-white/20 bg-white/[0.06]"
          style={{ aspectRatio: '2.39 / 1' }}
        >
          <span className="absolute bottom-2 right-3 font-label text-[10px] tracking-[0.1em] text-home-navy-ink-muted">
            2.39:1
          </span>
        </div>

        {/* 중간 프레임 — 1.85:1 플랫 */}
        <div
          className="absolute left-[14%] top-[28%] w-[80%] rotate-3 border border-white/25 bg-white/[0.08]"
          style={{ aspectRatio: '1.85 / 1' }}
        >
          <span className="absolute bottom-2 right-3 font-label text-[10px] tracking-[0.1em] text-home-navy-ink-muted">
            1.85:1
          </span>
        </div>

        {/* 전면 카드 — 데이터가 모여 완성된 추천 결과 */}
        <div className="absolute left-[10%] top-[52%] w-[84%] -rotate-2 overflow-hidden border border-home-brand/50 bg-home-navy-raised p-4 shadow-[0_24px_60px_rgba(0,0,0,0.5)]">
          <span className="absolute -bottom-2 -right-1 font-display text-[56px] font-extrabold leading-none text-white/[0.06]">
            96
          </span>
          <div className="relative flex items-center justify-between">
            <span className="font-label text-[10px] font-medium tracking-[0.1em] text-home-ice">MATCH 96%</span>
            <span className="h-1.5 w-1.5 rounded-full bg-home-brand" />
          </div>
          <p className="relative mt-2 font-display text-base font-bold tracking-[-0.02em] text-home-navy-ink">
            CGV 용산아이파크몰 IMAX관
          </p>
          <div className="relative mt-3 flex items-center gap-3 font-label text-[11px] text-home-navy-ink-muted">
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
