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
