// 저작권 이미지(포스터·브랜드 로고·실제 상영관 사진) 없이 성립하는 자체 일러스트 — docs/09 §1 원칙.
// 사진이 아니라 손으로 그린 듯한 극장 분위기(커튼·조명·좌석)를 SVG/CSS로 표현한다.

const CURTAIN = '#4a1420';
const CURTAIN_DARK = '#2c0c14';
const CURTAIN_LIGHT = '#6b2030';

/** 영화 카드의 포스터 대체 — 실제 화면비 데이터를 그대로 시각화하되, 극장 분위기(어두운 실내·
 * 커튼·스크린 조명)로 감싼다. 화면비 숫자는 장식이 아니라 실데이터 표현이다. */
export function AspectFrame({ aspect, className = '' }: { aspect?: string | null; className?: string }) {
  const ratio = aspect ? Number(aspect) : 1.85; // 미확인 시 통상적인 극장 화면비로 대체 표시
  return (
    <div
      aria-hidden
      className={`relative w-full overflow-hidden rounded-card ${className}`}
      style={{
        aspectRatio: `${ratio} / 1`,
        background: 'radial-gradient(ellipse 90% 80% at 50% 38%, #1c2440 0%, #0a0c16 75%)',
      }}
    >
      {/* 좌우 커튼 — 접힌 주름 질감 */}
      <div
        className="absolute inset-y-0 left-0 w-[12%]"
        style={{
          background: `repeating-linear-gradient(100deg, ${CURTAIN} 0px, ${CURTAIN_LIGHT} 5px, ${CURTAIN_DARK} 11px)`,
          boxShadow: `2px 0 10px rgba(0,0,0,0.5)`,
        }}
      />
      <div
        className="absolute inset-y-0 right-0 w-[12%]"
        style={{
          background: `repeating-linear-gradient(80deg, ${CURTAIN} 0px, ${CURTAIN_LIGHT} 5px, ${CURTAIN_DARK} 11px)`,
          boxShadow: `-2px 0 10px rgba(0,0,0,0.5)`,
        }}
      />
      {/* 상단 발란스(주름 장식) */}
      <div
        className="absolute inset-x-0 top-0 h-[16%]"
        style={{
          background: `radial-gradient(circle at 8% 0%, transparent 60%, ${CURTAIN} 62%),
            radial-gradient(circle at 24% 0%, transparent 60%, ${CURTAIN} 62%),
            radial-gradient(circle at 40% 0%, transparent 60%, ${CURTAIN} 62%),
            radial-gradient(circle at 56% 0%, transparent 60%, ${CURTAIN} 62%),
            radial-gradient(circle at 72% 0%, transparent 60%, ${CURTAIN} 62%),
            radial-gradient(circle at 88% 0%, transparent 60%, ${CURTAIN} 62%),
            linear-gradient(${CURTAIN_DARK}, ${CURTAIN_DARK})`,
          backgroundSize: '18% 100%, 18% 100%, 18% 100%, 18% 100%, 18% 100%, 18% 100%, 100% 60%',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'top',
        }}
      />
      {/* 스크린 — 은은한 빛 번짐 */}
      <div
        className="absolute inset-x-[16%] top-[20%] bottom-[14%] rounded-[2px]"
        style={{
          background: 'linear-gradient(180deg, #eef3ff 0%, #c7d6f5 100%)',
          boxShadow: '0 0 26px 6px rgba(180,205,255,0.35), 0 0 4px rgba(255,255,255,0.6)',
        }}
      />
      {/* 바닥 조명(객석 조명 힌트) */}
      <div
        className="absolute inset-x-[10%] bottom-[3%] h-[4%] rounded-full opacity-50"
        style={{ background: 'radial-gradient(ellipse, rgba(255,200,150,0.35) 0%, transparent 75%)' }}
      />
      <span className="absolute bottom-1.5 right-2.5 font-mono text-[10px] tracking-tight text-white/60">
        {ratio.toFixed(2)}:1
      </span>
    </div>
  );
}

/** 홈 히어로 — 커튼·조명·곡선 좌석 열까지 갖춘 극장 내부 일러스트(사진 아님, 손그림 느낌의 SVG) */
export function HeroVisual({ className = '' }: { className?: string }) {
  const rows = 5;
  const cols = 11;
  return (
    <svg aria-hidden viewBox="0 0 320 200" className={className} fill="none">
      <defs>
        <radialGradient id="cf-room" cx="50%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#1c2440" />
          <stop offset="100%" stopColor="#080a12" />
        </radialGradient>
        <radialGradient id="cf-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#eaf1ff" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#eaf1ff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="cf-screen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f4f8ff" />
          <stop offset="100%" stopColor="#c4d3f2" />
        </linearGradient>
        <linearGradient id="cf-seat" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a996f2" />
          <stop offset="100%" stopColor="#5c4aa8" />
        </linearGradient>
        <linearGradient id="cf-curtain-fold" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={CURTAIN_DARK} />
          <stop offset="50%" stopColor={CURTAIN_LIGHT} />
          <stop offset="100%" stopColor={CURTAIN_DARK} />
        </linearGradient>
      </defs>

      <rect x="0" y="0" width="320" height="200" fill="url(#cf-room)" />

      {/* 스크린 조명 번짐 + 스크린 */}
      <ellipse cx="160" cy="58" rx="120" ry="55" fill="url(#cf-glow)" />
      <rect x="76" y="30" width="168" height="56" rx="3" fill="url(#cf-screen)" />
      <rect x="76" y="30" width="168" height="56" rx="3" fill="none" stroke="#0a0c16" strokeWidth="1.5" opacity="0.4" />

      {/* 좌우 커튼(자연스럽게 열린 형태) */}
      <path d="M0 0 H34 C30 60 26 140 34 200 H0 Z" fill="url(#cf-curtain-fold)" />
      <path d="M320 0 H286 C290 60 294 140 286 200 H320 Z" fill="url(#cf-curtain-fold)" />
      {Array.from({ length: 5 }).map((_, i) => (
        <path
          key={`fold-l-${i}`}
          d={`M${6 + i * 6} 0 C ${4 + i * 6} 70, ${8 + i * 6} 140, ${6 + i * 6} 200`}
          stroke="rgba(0,0,0,0.25)"
          strokeWidth="1.5"
          fill="none"
        />
      ))}
      {Array.from({ length: 5 }).map((_, i) => (
        <path
          key={`fold-r-${i}`}
          d={`M${314 - i * 6} 0 C ${316 - i * 6} 70, ${312 - i * 6} 140, ${314 - i * 6} 200`}
          stroke="rgba(0,0,0,0.25)"
          strokeWidth="1.5"
          fill="none"
        />
      ))}

      {/* 곡선 좌석 열 — 뒤로 갈수록 넓고 낮은 조도 */}
      {Array.from({ length: rows }).map((_, row) => {
        const y = 110 + row * 16;
        const arc = 10 - row * 1.4; // 뒷줄일수록 완만한 곡선
        const opacity = 0.95 - row * 0.15;
        return (
          <g key={row} opacity={opacity}>
            {Array.from({ length: cols }).map((_, col) => {
              const t = col / (cols - 1);
              const x = 30 + col * ((260 - row * 6) / (cols - 1)) + row * 3;
              const curveY = y - Math.sin(t * Math.PI) * arc;
              const isHighlight = row === 2 && col === 5;
              return (
                <rect
                  key={col}
                  x={x}
                  y={curveY}
                  width="14"
                  height="8"
                  rx="2.5"
                  fill={isHighlight ? 'var(--accent)' : 'url(#cf-seat)'}
                  opacity={isHighlight ? 1 : 0.85}
                />
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}
