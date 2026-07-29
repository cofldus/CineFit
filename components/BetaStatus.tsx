// 베타 상태 칩 — 8차 마일스톤까지의 큰 경고 카드를 대체한다. 사실 관계(테스트용 데이터)는
// 숨기지 않되, CTA보다 시각적으로 강하지 않은 작은 라벨로만 둔다(§6).
export function BetaStatus({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 border border-ed-hairline px-2 py-0.5 font-label text-[10px] font-medium uppercase tracking-[0.12em] text-ed-ink-muted ${className}`}
    >
      Beta
    </span>
  );
}
