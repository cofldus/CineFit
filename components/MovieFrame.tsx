// Now showing 카드용 프레임 — 극장 커튼·스크린 일러스트(components/ScreenArt.tsx의
// AspectFrame) 대신, 실제 화면비 숫자 자체를 큰 타이포그래피로 써서 시각적 무게를 준다(§8
// 포스터 저작권 문제 없이 화면비 데이터를 시각화). 첫 시도(단색 그라디언트만)는 사용자
// 피드백상 "빈 자리처럼 보인다"는 문제가 있어, 큰 화면비 숫자 + 은은한 프로젝터 빛 번짐 +
// 미세한 그리드 텍스처로 담백하되 완성된 느낌을 만든다.
export function MovieFrame({ aspect, className = '' }: { aspect?: string | null; className?: string }) {
  const ratio = aspect ? Number(aspect) : 1.85;
  return (
    <div
      aria-hidden
      className={`relative w-full overflow-hidden bg-home-navy ${className}`}
      style={{ aspectRatio: `${ratio} / 1` }}
    >
      {/* 프로젝터 빛 번짐 — 아주 은은하게(opacity 낮은 radial gradient), 장식이 아니라 깊이감 */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 70% 60% at 30% 20%, rgba(58,95,217,0.28) 0%, transparent 70%)',
        }}
      />
      {/* 미세한 그리드 텍스처 — 좌석/스크린 격자를 연상시키는 기술적 질감 */}
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: 'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />
      {/* 화면비 숫자 — 장식이 아니라 실데이터를 큰 타이포그래피로 */}
      <span className="absolute -bottom-3 left-1 font-display text-[64px] font-extrabold leading-none tracking-[-0.03em] text-white/[0.09]">
        {ratio.toFixed(2)}
      </span>
      <span className="absolute bottom-2 right-2.5 font-label text-[10px] tracking-[0.06em] text-white/60">
        {ratio.toFixed(2)}:1
      </span>
    </div>
  );
}
