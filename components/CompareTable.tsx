import { FORMAT_LABELS } from '../src/domain/recommendation/presets';
import type { PickLabel, ScoredCandidate } from '../src/domain/recommendation/types';

const timeFmt = new Intl.DateTimeFormat('ko-KR', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'Asia/Seoul',
});

// 최대 3회차 × 축 비교 — 가로 스크롤 컨테이너 (docs/09 §3 CompareTable)
export function CompareTable({ picks }: { picks: { label: PickLabel; scored: ScoredCandidate }[] }) {
  if (picks.length < 2) return null;
  const rows: { name: string; render: (s: ScoredCandidate) => string }[] = [
    { name: '상영관', render: (s) => `${s.candidate.location.name} ${s.candidate.auditorium.no}` },
    { name: '포맷', render: (s) => FORMAT_LABELS[s.candidate.format] ?? s.candidate.format },
    { name: '시작', render: (s) => timeFmt.format(new Date(s.candidate.startsAt)) },
    { name: '종료 예정', render: (s) => timeFmt.format(new Date(s.candidate.endsAtEst)) },
    { name: '종합 점수', render: (s) => s.final.toFixed(3) },
    { name: '포맷 적합', render: (s) => s.axes.ffm.toFixed(2) },
    { name: '관 품질', render: (s) => s.axes.audQ.toFixed(2) },
    { name: '이동(추정)', render: (s) => `${s.travelMinutes}분` },
    { name: '가격', render: (s) => `${s.candidate.priceAdult.toLocaleString('ko-KR')}원` },
    { name: '데이터 신뢰도', render: (s) => s.axes.dc.toFixed(2) },
    { name: '확신도', render: (s) => s.confidenceLabel },
  ];

  return (
    <section aria-label="추천 상영관 비교">
      <h2>한눈에 비교</h2>
      <div className="table-scroll" tabIndex={0} role="region" aria-label="비교 표 (가로 스크롤)">
        <table className="compare">
          <thead>
            <tr>
              <td />
              {picks.map((p) => (
                <th key={p.label} scope="col">
                  {p.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.name}>
                <th scope="row">{row.name}</th>
                {picks.map((p) => (
                  <td key={p.label}>{row.render(p.scored)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
