// 저작권 이미지(포스터·브랜드 로고) 없이 성립하는 자체 비주얼 — docs/09 §1 원칙.
// 스크린·좌석을 연상시키는 추상 프레임만 사용한다.

/** 영화 카드의 포스터 대체 — 실제 화면비 데이터를 그대로 시각화한다(장식용 이미지가 아님). */
export function AspectFrame({ aspect, className = '' }: { aspect?: string | null; className?: string }) {
  const ratio = aspect ? Number(aspect) : 1.85; // 미확인 시 통상적인 극장 화면비로 대체 표시
  return (
    <div
      aria-hidden
      className={`relative w-full overflow-hidden rounded-card border border-border bg-gradient-to-br from-surface-raised to-bg ${className}`}
      style={{ aspectRatio: `${ratio} / 1` }}
    >
      <div className="absolute inset-3 rounded-[3px] border border-accent/30" />
      <div className="absolute inset-y-3 left-3 w-[3px] rounded-full bg-primary/30" />
      <div className="absolute inset-y-3 right-3 w-[3px] rounded-full bg-primary/30" />
      <span className="absolute bottom-1.5 right-2.5 font-mono text-[10px] tracking-tight text-text-sub/70">
        {ratio.toFixed(2)}:1
      </span>
    </div>
  );
}

/** 홈 히어로 — 스크린에서 뻗어나오는 빛과 좌석 열을 추상화한 자체 SVG */
export function HeroVisual({ className = '' }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 320 180"
      className={className}
      fill="none"
    >
      <defs>
        <linearGradient id="cf-beam" x1="160" y1="10" x2="160" y2="170" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="var(--primary)" stopOpacity="0.35" />
          <stop offset="1" stopColor="var(--primary)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="M110 14 L210 14 L268 100 L52 100 Z" fill="url(#cf-beam)" />
      <rect x="70" y="10" width="180" height="10" rx="3" fill="var(--surface-raised)" stroke="var(--border)" />
      {Array.from({ length: 4 }).map((_, row) => (
        <g key={row} opacity={1 - row * 0.16}>
          {Array.from({ length: 9 }).map((_, col) => (
            <rect
              key={col}
              x={40 + col * 27.5 - row * 4}
              y={122 + row * 13}
              width="16"
              height="9"
              rx="2.5"
              fill="var(--accent)"
              opacity={0.22 + (row === 1 && col === 4 ? 0.55 : 0)}
            />
          ))}
        </g>
      ))}
    </svg>
  );
}
