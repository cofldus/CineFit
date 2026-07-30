import { FORMAT_LABELS } from '../src/domain/recommendation/presets';
import type { PickLabel, ScoredCandidate } from '../src/domain/recommendation/types';

const timeFmt = new Intl.DateTimeFormat('ko-KR', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'Asia/Seoul',
});

const pct = (x: number) => `${Math.round(Math.min(1, Math.max(0, x)) * 100)}%`;

// 최대 3회차 × 축 비교 — 가로 스크롤 컨테이너 (docs/09 §3 CompareTable)
export function CompareTable({ picks }: { picks: { label: PickLabel; scored: ScoredCandidate }[] }) {
  if (picks.length < 2) return null;
  const rows: { name: string; render: (s: ScoredCandidate) => string }[] = [
    { name: '상영관', render: (s) => `${s.candidate.location.name} ${s.candidate.auditorium.no}` },
    { name: '포맷', render: (s) => FORMAT_LABELS[s.candidate.format] ?? s.candidate.format },
    { name: '시작', render: (s) => timeFmt.format(new Date(s.candidate.startsAt)) },
    { name: '종료 예정', render: (s) => timeFmt.format(new Date(s.candidate.endsAtEst)) },
    { name: '종합 점수', render: (s) => pct(s.final) },
    { name: '포맷 만족도', render: (s) => pct(s.axes.ffm) },
    { name: '상영관 품질', render: (s) => pct(s.axes.audQ) },
    { name: '이동(추정)', render: (s) => `${s.travelMinutes}분` },
    { name: '가격', render: (s) => `${s.candidate.priceAdult.toLocaleString('ko-KR')}원` },
    { name: '정보 신뢰도', render: (s) => pct(s.axes.dc) },
    { name: '확신도', render: (s) => s.confidenceLabel },
  ];

  return (
    <section aria-label="추천 상영관 비교">
      <h2 className="font-wanted text-lg font-bold tracking-[-0.01em] text-text">한눈에 비교</h2>

      {/* 모바일: 속성 우선 카드형 — 좁은 화면에서 가로 스크롤 표보다 읽기 쉽다 */}
      <div className="mt-2 flex flex-col gap-2 sm:hidden">
        {rows.map((row) => (
          <div key={row.name} className="rounded-card border border-border bg-surface p-3">
            <p className="m-0 text-xs font-semibold text-text-sub">{row.name}</p>
            <div className="mt-1.5 grid grid-cols-3 gap-2">
              {picks.map((p) => (
                <div key={p.label} className="text-sm font-medium text-text">
                  <span className="block text-[11px] font-semibold text-text-sub">{p.label}</span>
                  {row.render(p.scored)}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* 태블릿 이상: 3열 표 — 항목이 많아도 데스크톱 폭에서는 스크롤 없이 한눈에 들어온다 */}
      <div
        className="mt-2 hidden overflow-x-auto rounded-card-lg border border-border sm:block"
        tabIndex={0}
        role="region"
        aria-label="비교 표 (가로 스크롤)"
      >
        <table className="w-full min-w-[520px] border-collapse text-sm">
          <thead>
            <tr>
              <td className="border-b border-border p-0" />
              {picks.map((p) => (
                <th key={p.label} scope="col" className="border-b border-border p-3 text-left font-bold text-text">
                  {p.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.name}>
                <th scope="row" className="whitespace-nowrap border-b border-border p-3 text-left font-medium text-text-sub">
                  {row.name}
                </th>
                {picks.map((p) => (
                  <td key={p.label} className="border-b border-border p-3 align-top font-medium text-text">
                    {row.render(p.scored)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
