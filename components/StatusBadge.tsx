// 회차 데이터 구분 배지 — RecommendCard·상영관 상세에서 각자 마크업을 만들던 것을 통합.
// 같은 상태는 항상 같은 아이콘·색·문구로 보이도록 한다(docs/DESIGN-SYSTEM.md §상태 배지).
export type ShowtimeStatusKind = 'synthetic' | 'verified';

const CONFIG: Record<ShowtimeStatusKind, { icon: string; full: string; compact: string; cls: string }> = {
  synthetic: { icon: '≈', full: '검증용 합성 회차', compact: '합성', cls: 'border-trust-mid/40 text-trust-mid' },
  verified: { icon: '✔', full: '관리자 확인 회차', compact: '관리자 확인', cls: 'border-trust-high/40 text-trust-high' },
};

export function ShowtimeStatusBadge({
  kind,
  variant = 'pill',
}: {
  kind: ShowtimeStatusKind;
  /** pill: 카드 안 강조용 배지 / compact: 목록 행 안 짧은 표기 */
  variant?: 'pill' | 'compact';
}) {
  const c = CONFIG[kind];
  if (variant === 'compact') {
    return (
      <span className={`inline-flex items-center gap-1 whitespace-nowrap text-xs font-medium ${c.cls}`}>
        <span aria-hidden>{c.icon}</span> {c.compact}
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium ${c.cls}`}
    >
      <span aria-hidden>{c.icon}</span> {c.full}
    </span>
  );
}
