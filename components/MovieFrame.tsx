// Now showing 타일용 프레임 — 포스터 대신 실제 화면비 숫자를 큰 타이포그래피로 써서 시각적
// 무게를 준다(포스터 저작권 문제 회피 + 데이터 자체를 그래픽 언어로). 세 타일이 똑같은
// 템플릿의 반복으로 보이지 않도록 variant별로 숫자 위치·그리드 텍스처 강조·비율 라벨 노출
// 여부를 다르게 한다 — "lead"는 숫자를 가장 크게 앞세우고, "overlay"는 하단에 텍스트가 얹힐
// 자리를 비워 비율 라벨을 생략한다(캡션과 겹치는 것을 피함), "plain"은 기본형.
export type MovieFrameVariant = 'lead' | 'overlay' | 'plain';

export function MovieFrame({
  aspect,
  variant = 'plain',
  className = '',
}: {
  aspect?: string | null;
  variant?: MovieFrameVariant;
  className?: string;
}) {
  const ratio = aspect ? Number(aspect) : 1.85;
  const numeralSize = variant === 'lead' ? 'text-[96px]' : 'text-[52px]';

  return (
    <div
      aria-hidden
      className={`relative w-full overflow-hidden bg-home-navy ${className}`}
      style={{ aspectRatio: `${ratio} / 1` }}
    >
      {/* 프로젝터 빛 번짐 — 아주 은은하게, 장식이 아니라 깊이감 */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 70% 60% at 30% 20%, rgba(58,95,217,0.24) 0%, transparent 70%)',
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
      <span
        className={`absolute -bottom-3 left-1 font-wanted ${numeralSize} font-extrabold leading-none tracking-[-0.03em] text-white/[0.09]`}
      >
        {ratio.toFixed(2)}
      </span>
      {variant === 'overlay' && (
        <div
          className="absolute inset-x-0 bottom-0 h-2/3"
          style={{ background: 'linear-gradient(to top, rgba(6,8,12,0.92) 0%, transparent 100%)' }}
        />
      )}
      {variant !== 'overlay' && (
        <span className="absolute bottom-2 right-2.5 font-wanted text-[10px] tracking-[0.06em] text-white/60">
          {ratio.toFixed(2)}:1
        </span>
      )}
    </div>
  );
}
