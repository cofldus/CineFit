const LEGEND = [
  { label: '공식 확인', detail: '배급사·극장 공식 자료' },
  { label: '복수 출처 확인', detail: '서로 다른 출처가 일치' },
  { label: '사용자 제보', detail: '관람객이 직접 확인' },
  { label: '추정치', detail: '확인 전, 참고용' },
] as const;

/** §4-E — 신뢰도 4단계를 색 배지 대신 담백한 legend 한 줄로 정리한다. */
export function TrustLegend() {
  return (
    <ul className="m-0 flex list-none flex-wrap gap-x-8 gap-y-4 p-0">
      {LEGEND.map((l) => (
        <li key={l.label} className="flex items-start gap-2">
          <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-home-brand" />
          <span>
            <span className="block text-sm font-semibold text-home-light-ink">{l.label}</span>
            <span className="block text-xs text-home-light-ink-muted">{l.detail}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
