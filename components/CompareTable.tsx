import { FORMAT_LABELS } from '../src/domain/recommendation/presets';
import type { PickLabel, ScoredCandidate } from '../src/domain/recommendation/types';
import { pct } from '../src/lib/display';

const timeFmt = new Intl.DateTimeFormat('ko-KR', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'Asia/Seoul',
});

type Row = {
  name: string;
  render: (s: ScoredCandidate) => string;
  /** 있으면 이 축에서 "승자"를 굵게 표시한다 — 숫자만 늘어놓지 말고 어느 쪽이 좋은지 바로
   * 알려달라는 피드백. 카테고리형 값(포맷·확신도 등)은 없음(비교 의미가 없다). */
  numeric?: (s: ScoredCandidate) => number;
  winnerDir?: 'min' | 'max';
  winnerLabel?: string;
};

// 기본 노출은 5개 핵심 축(이동/가격/포맷/상영관 품질/정보 신뢰도)만 — 나머지는
// "전체 비교 보기" 안에 남긴다. 처음 화면이 데이터 비교표처럼 보이지 않게 하려는 목적.
const CORE_ROWS: Row[] = [
  { name: '포맷', render: (s) => FORMAT_LABELS[s.candidate.format] ?? s.candidate.format },
  {
    name: '이동',
    render: (s) => `${s.travelMinutes}분`,
    numeric: (s) => s.travelMinutes,
    winnerDir: 'min',
    winnerLabel: '가장 가까움',
  },
  {
    name: '가격',
    render: (s) => `${s.candidate.priceAdult.toLocaleString('ko-KR')}원`,
    numeric: (s) => s.candidate.priceAdult,
    winnerDir: 'min',
    winnerLabel: '최저가',
  },
  {
    name: '상영관 품질',
    render: (s) => pct(s.axes.audQ),
    numeric: (s) => s.axes.audQ,
    winnerDir: 'max',
    winnerLabel: '가장 높음',
  },
  {
    name: '정보 신뢰도',
    render: (s) => pct(s.axes.dc),
    numeric: (s) => s.axes.dc,
    winnerDir: 'max',
    winnerLabel: '가장 높음',
  },
];

const EXTRA_ROWS: Row[] = [
  { name: '상영관', render: (s) => `${s.candidate.location.name} ${s.candidate.auditorium.no}` },
  { name: '시작', render: (s) => timeFmt.format(new Date(s.candidate.startsAt)) },
  { name: '종료 예정', render: (s) => timeFmt.format(new Date(s.candidate.endsAtEst)) },
  {
    name: '종합 적합도',
    render: (s) => pct(s.final),
    numeric: (s) => s.final,
    winnerDir: 'max',
    winnerLabel: '가장 높음',
  },
  {
    name: '포맷 만족도',
    render: (s) => pct(s.axes.ffm),
    numeric: (s) => s.axes.ffm,
    winnerDir: 'max',
    winnerLabel: '가장 높음',
  },
  { name: '확신도', render: (s) => s.confidenceLabel },
];

function winnerIndex(row: Row, picks: { scored: ScoredCandidate }[]): number | null {
  if (!row.numeric || !row.winnerDir) return null;
  const values = picks.map((p) => row.numeric!(p.scored));
  const best = row.winnerDir === 'min' ? Math.min(...values) : Math.max(...values);
  const idx = values.indexOf(best);
  // 값이 전부 같으면(동률) 승자를 표시하지 않는다 — 의미 없는 강조를 피한다.
  return values.every((v) => v === best) ? null : idx;
}

function RowGroup({ rows, picks }: { rows: Row[]; picks: { label: PickLabel; scored: ScoredCandidate }[] }) {
  return (
    <>
      {/* 모바일: 속성 우선 카드형 — 좁은 화면에서 가로 스크롤 표보다 읽기 쉽다 */}
      <div className="mt-2 flex flex-col gap-2 sm:hidden">
        {rows.map((row) => {
          const winIdx = winnerIndex(row, picks);
          return (
            <div key={row.name} className="rounded-card border border-border bg-surface p-3">
              <p className="m-0 text-[13px] font-semibold text-text-sub">{row.name}</p>
              <div className="mt-1.5 grid grid-cols-3 gap-2">
                {picks.map((p, i) => (
                  <div key={p.label} className="text-sm font-medium text-text">
                    <span className="block text-[13px] font-semibold text-text-sub">{p.label}</span>
                    <span className={i === winIdx ? 'font-bold text-trust-high' : ''}>{row.render(p.scored)}</span>
                    {i === winIdx ? <span className="block text-[13px] text-trust-high">{row.winnerLabel}</span> : null}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
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
            {rows.map((row) => {
              const winIdx = winnerIndex(row, picks);
              return (
                <tr key={row.name}>
                  <th scope="row" className="whitespace-nowrap border-b border-border p-3 text-left font-medium text-text-sub">
                    {row.name}
                  </th>
                  {picks.map((p, i) => (
                    <td
                      key={p.label}
                      className={`border-b border-border p-3 align-top font-medium ${i === winIdx ? 'text-trust-high' : 'text-text'}`}
                    >
                      <span className={i === winIdx ? 'font-bold' : ''}>{row.render(p.scored)}</span>
                      {i === winIdx ? <span className="ml-1.5 text-[13px]">({row.winnerLabel})</span> : null}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

// 조건 비교 — 기본은 5개 핵심 축만, 전체 축은 "전체 비교 보기" 안에 (docs/09 §3 CompareTable)
export function CompareTable({ picks }: { picks: { label: PickLabel; scored: ScoredCandidate }[] }) {
  if (picks.length < 2) return null;

  return (
    <section aria-label="추천 상영관 비교">
      <h2 className="font-wanted text-lg font-bold tracking-[-0.01em] text-text">한눈에 비교</h2>
      <p className="m-0 mt-1 text-[13px] text-text-sub">이동 시간은 추정치, 가격은 선택한 회차 기준이에요.</p>

      <RowGroup rows={CORE_ROWS} picks={picks} />

      <details className="mt-3">
        <summary className="flex min-h-11 cursor-pointer items-center text-[13px] font-medium text-text underline decoration-border underline-offset-2 hover:decoration-primary-strong">
          전체 비교 보기
        </summary>
        <RowGroup rows={EXTRA_ROWS} picks={picks} />
      </details>
    </section>
  );
}
