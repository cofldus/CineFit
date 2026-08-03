'use client';

import { useState } from 'react';
import { FORMAT_LABELS } from '../src/domain/recommendation/presets';
import type { PickLabel, ScoredCandidate } from '../src/domain/recommendation/types';
import { pct } from '../src/lib/display';
import { IconCheckCircle } from './Icon';

const timeFmt = new Intl.DateTimeFormat('ko-KR', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'Asia/Seoul',
});

type Pick = { label: PickLabel; scored: ScoredCandidate };

type Row = {
  name: string;
  render: (s: ScoredCandidate) => string;
  numeric?: (s: ScoredCandidate) => number;
  winnerDir?: 'min' | 'max';
  judgment?: (pickLabel: PickLabel, value: string) => string;
};

const CORE_ROWS: Row[] = [
  { name: '포맷', render: (s) => FORMAT_LABELS[s.candidate.format] ?? s.candidate.format },
  {
    name: '이동',
    render: (s) => `${s.travelMinutes}분`,
    numeric: (s) => s.travelMinutes,
    winnerDir: 'min',
    judgment: (label, value) => `${label} 추천이 ${value}으로 가장 가깝습니다.`,
  },
  {
    name: '가격',
    render: (s) => `${s.candidate.priceAdult.toLocaleString('ko-KR')}원`,
    numeric: (s) => s.candidate.priceAdult,
    winnerDir: 'min',
    judgment: (label, value) => `${label} 추천이 ${value}으로 가장 저렴합니다.`,
  },
  {
    name: '상영관 품질',
    render: (s) => pct(s.axes.audQ),
    numeric: (s) => s.axes.audQ,
    winnerDir: 'max',
    judgment: (label, value) => `${label} 추천의 상영관 품질이 ${value}로 가장 높습니다.`,
  },
  {
    name: '정보 신뢰도',
    render: (s) => pct(s.axes.dc),
    numeric: (s) => s.axes.dc,
    winnerDir: 'max',
    judgment: (label, value) => `${label} 추천의 정보 신뢰도가 ${value}로 가장 높습니다.`,
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
  },
  {
    name: '포맷 만족도',
    render: (s) => pct(s.axes.ffm),
    numeric: (s) => s.axes.ffm,
    winnerDir: 'max',
  },
  { name: '확신도', render: (s) => s.confidenceLabel },
];

// 화질과 사운드는 도메인 모델에 별도 축이 없다(auditorium quality 하나로 계산됨) — 실제
// 데이터에 없는 숫자를 새로 만들 수 없으므로 두 필터를 "화질·사운드" 하나로 합쳤다.
const FILTERS: { key: string; label: string; rowName?: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'quality', label: '화질·사운드', rowName: '상영관 품질' },
  { key: 'travel', label: '이동', rowName: '이동' },
  { key: 'price', label: '가격', rowName: '가격' },
  { key: 'trust', label: '신뢰도', rowName: '정보 신뢰도' },
];

function winnerIndices(row: Row, picks: Pick[]): number[] {
  if (!row.numeric || !row.winnerDir) return [];
  const values = picks.map((p) => row.numeric!(p.scored));
  const best = row.winnerDir === 'min' ? Math.min(...values) : Math.max(...values);
  if (values.every((v) => v === best)) return [];
  return values.flatMap((v, i) => (v === best ? [i] : []));
}

/**
 * "추천 차이 요약" — 표를 보기 전에 결론부터 이해하게 한다. 카드 3개를 다시 늘어놓는 대신
 * 얇은 편집형 줄 3개로: 가장 좋은 상영 환경 / 가장 저렴한 선택 / 가장 짧은 이동. 동률이면
 * "각각"으로 묶어서 보여준다(승자를 억지로 하나만 고르지 않는다).
 */
export function DifferenceSummary({ picks }: { picks: Pick[] }) {
  if (picks.length < 2) return null;

  const lines: { title: string; winners: Pick[]; valueText: string }[] = [
    (() => {
      const values = picks.map((p) => p.scored.axes.audQ);
      const best = Math.max(...values);
      const winners = picks.filter((p) => p.scored.axes.audQ === best);
      return { title: '가장 좋은 상영 환경', winners, valueText: `품질 ${pct(best)}` };
    })(),
    (() => {
      const values = picks.map((p) => p.scored.candidate.priceAdult);
      const best = Math.min(...values);
      const winners = picks.filter((p) => p.scored.candidate.priceAdult === best);
      return { title: '가장 저렴한 선택', winners, valueText: `${best.toLocaleString('ko-KR')}원` };
    })(),
    (() => {
      const values = picks.map((p) => p.scored.travelMinutes);
      const best = Math.min(...values);
      const winners = picks.filter((p) => p.scored.travelMinutes === best);
      return { title: '가장 짧은 이동', winners, valueText: `${best}분` };
    })(),
  ];

  // 각 관점의 승자를 누르면 해당 후보 카드로 바로 이동한다(카드 id: pick-rank-N).
  return (
    <section aria-label="추천 차이 요약" className="divide-y divide-border">
      {lines.map((line) => {
        const first = line.winners[0];
        const rank = picks.indexOf(first) + 1;
        return (
          <div key={line.title} className="flex flex-col gap-0.5 py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
            <p className="m-0 text-[13.5px] font-semibold text-text-tertiary">{line.title}</p>
            <p className="m-0 text-[15px] font-medium tabular-nums text-text">
              <a href={`#pick-rank-${rank}`} className="font-bold hover:underline decoration-border-strong underline-offset-2">
                {line.winners.length > 1 ? `${line.winners.map((w) => w.label).join('·')} 추천` : `${first.label} 추천`}
              </a>{' '}
              · {line.winners.length > 1 ? `각각 ${line.valueText}` : line.valueText}
            </p>
          </div>
        );
      })}
    </section>
  );
}

function RowList({ rows, picks }: { rows: Row[]; picks: Pick[] }) {
  return (
    <div className="divide-y divide-border">
      {rows.map((row) => {
        const winners = winnerIndices(row, picks);
        return (
          <div key={row.name} className="py-3">
            <p className="m-0 text-[13px] font-semibold text-text-tertiary">{row.name}</p>
            <div className="mt-1.5 grid grid-cols-3 gap-3">
              {picks.map((p, i) => {
                const isWinner = winners.includes(i);
                return (
                  <div key={p.label} className="text-[14px] tabular-nums text-text">
                    <span className="block text-[12px] font-medium text-text-tertiary">{p.label}</span>
                    <span className={`inline-flex items-center gap-1 ${isWinner ? 'font-bold' : 'font-medium'}`}>
                      {isWinner ? <IconCheckCircle className="h-3.5 w-3.5 shrink-0 text-trust-high" /> : null}
                      {row.render(p.scored)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * "상세 비교" — 기본 화면에서 전체 표를 노출하지 않는다("세부 수치 비교"를 눌러야 펼쳐진다).
 * 필터는 진한 배경 박스가 아니라 얇은 sliding underline으로 표시하고, 필터를 바꾸면 표
 * 색상이 아니라 그 기준의 판단 문장이 함께 갱신된다. 최우수 값은 코랄색이 아니라 체크
 * 아이콘 + 굵기로 표현하고, 표 자체는 외곽 박스 없이 옅은 가로 구분선만 쓴다.
 */
export function DetailedCompare({ picks }: { picks: Pick[] }) {
  const [filterIdx, setFilterIdx] = useState(0);
  if (picks.length < 2) return null;

  const active = FILTERS[filterIdx];
  const activeRow = active.rowName ? (CORE_ROWS.find((r) => r.name === active.rowName) ?? null) : null;
  const winners = activeRow ? winnerIndices(activeRow, picks) : [];
  const sentence =
    activeRow && activeRow.judgment && winners.length === 1
      ? activeRow.judgment(picks[winners[0]].label, activeRow.render(picks[winners[0]].scored))
      : null;

  return (
    <details>
      <summary className="flex min-h-11 cursor-pointer items-center text-[14px] font-semibold text-primary hover:underline decoration-primary underline-offset-2">
        후보 {picks.length}개 자세히 비교 →
      </summary>

      <div className="mt-4">
        <div role="tablist" aria-label="비교 기준" className="relative flex gap-5 border-b border-border">
          {FILTERS.map((f, i) => (
            <button
              key={f.key}
              type="button"
              role="tab"
              aria-selected={filterIdx === i}
              onClick={() => setFilterIdx(i)}
              className={`relative min-h-11 px-0.5 text-[13.5px] font-semibold transition-colors ${
                filterIdx === i ? 'text-text' : 'text-text-tertiary hover:text-text-sub'
              }`}
            >
              {f.label}
              {filterIdx === i ? (
                <span aria-hidden className="absolute inset-x-0 -bottom-px h-[2px] rounded-full bg-primary-strong" />
              ) : null}
            </button>
          ))}
        </div>

        {sentence ? <p className="m-0 mt-3 text-[14.5px] font-medium text-text">{sentence}</p> : null}

        <div className="mt-3">
          <RowList rows={CORE_ROWS} picks={picks} />
        </div>

        <details className="mt-3">
          <summary className="flex min-h-11 cursor-pointer items-center text-[13px] font-medium text-text hover:underline decoration-border-strong underline-offset-2">
            전체 축 보기
          </summary>
          <RowList rows={EXTRA_ROWS} picks={picks} />
        </details>
      </div>
    </details>
  );
}
