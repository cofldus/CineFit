'use client';

import { useState } from 'react';
import type { SeatZone } from '../src/domain/recommendation/types';
import { pct, SEAT_PURPOSE_LABELS } from '../src/lib/display';
import { TrustBadge } from './TrustBadge';

// 실제 좌석 배치도가 없으므로(문서: 좌석 존은 열 범위·구역 설명 텍스트로만 존재) 정확한
// 좌석 하나하나가 아니라 "대략 이 부근" 개략도를 그린다 — 없는 좌석 좌표를 지어내지 않고,
// 이미 있는 rowRange/colRange 문구를 이 그리드 위 대략적인 위치로만 옮긴다.
const ROW_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N'];
const COL_COUNT = 11;
const WEAK_STATUSES = new Set(['estimated', 'rumor', 'single_unverified']);

function rowSpan(rowRange: string | null): [number, number] {
  if (!rowRange) return [6, 8];
  if (rowRange.includes('후방')) return [ROW_LETTERS.length - 5, ROW_LETTERS.length - 1];
  if (rowRange.includes('전방')) return [0, 3];
  const letters = Array.from(new Set(rowRange.match(/[A-Z]/g) ?? []));
  if (letters.length > 0) {
    const idxs = letters.map((l) => ROW_LETTERS.indexOf(l)).filter((i) => i >= 0);
    if (idxs.length > 0) {
      const min = Math.min(...idxs);
      const max = Math.max(...idxs);
      return rowRange.includes('이후') ? [min, ROW_LETTERS.length - 1] : [min, max];
    }
  }
  if (rowRange.includes('중앙')) {
    const mid = Math.floor(ROW_LETTERS.length / 2);
    return [mid - 1, mid + 1];
  }
  return [6, 8];
}

function colSpan(colRange: string | null): [number, number] {
  if (!colRange) return [3, 7];
  if (colRange.includes('전체')) return [0, COL_COUNT - 1];
  if (colRange.includes('좌')) return [0, 3];
  if (colRange.includes('우')) return [COL_COUNT - 4, COL_COUNT - 1];
  return [3, 7];
}

/**
 * 상영관 상세 — 목적별 좌석 구역을 카드 목록 대신 극장 평면 개략도로 보여준다. 존이
 * 여러 개면 위 탭으로 전환해서 같은 그리드에 겹치지 않게 하나씩 표시한다. 확신도가
 * 낮은 존(estimated/rumor/single_unverified)은 점선 테두리로, 그 외에는 버건디
 * 그라데이션 채움으로 구분한다(브리프: "근거가 약한 구역은 점선 테두리").
 */
export function SeatMap({ zones }: { zones: SeatZone[] }) {
  const [activeIdx, setActiveIdx] = useState(0);
  if (zones.length === 0) return null;
  const idx = Math.min(activeIdx, zones.length - 1);
  const active = zones[idx];
  const [rowStart, rowEnd] = rowSpan(active.rowRange);
  const [colStart, colEnd] = colSpan(active.colRange);
  const weak = WEAK_STATUSES.has(active.infoStatus);

  return (
    <div className="rounded-card-xl bg-hero p-5 sm:p-6">
      {zones.length > 1 ? (
        <div className="mb-4 flex flex-wrap gap-1.5" role="tablist" aria-label="좌석 구역 선택">
          {zones.map((z, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === idx}
              onClick={() => setActiveIdx(i)}
              className={`rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition-colors ${
                i === idx
                  ? 'border-primary-strong bg-primary-strong text-white'
                  : 'border-hero-border text-hero-text-sub hover:text-hero-text'
              }`}
            >
              {z.purposes.map((p) => SEAT_PURPOSE_LABELS[p] ?? p).join('·') || `구역 ${i + 1}`}
            </button>
          ))}
        </div>
      ) : null}

      {/* 곡면 스크린 — 위로 완만하게 휜 아크 선(객석에서 본 시네마 스크린의 평면 곡률).
          아래로 옅은 스크린 불빛이 좌석 그리드 쪽으로 번진다. */}
      <div aria-hidden className="relative mx-auto w-[86%]">
        <svg viewBox="0 0 100 10" preserveAspectRatio="none" className="block h-[14px] w-full">
          <path d="M2 9 Q 50 0.5 98 9" stroke="var(--accent)" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        </svg>
        <div
          className="pointer-events-none absolute inset-x-[10%] top-full h-10 opacity-50"
          style={{ background: 'radial-gradient(ellipse 60% 100% at 50% 0%, var(--hero-soft), transparent 75%)' }}
        />
      </div>
      <p aria-hidden className="mb-4 mt-1.5 text-center text-[10px] font-semibold uppercase tracking-[0.25em] text-hero-text-sub">
        Screen
      </p>

      <div
        className="mx-auto flex max-w-[360px] flex-col gap-[3px]"
        role="img"
        aria-label={`${[active.rowRange, active.colRange].filter(Boolean).join(' ') || '전체'} 구역 개략도`}
      >
        {ROW_LETTERS.map((letter, r) => {
          const inRow = r >= rowStart && r <= rowEnd;
          return (
            <div key={letter} className="flex items-center gap-[3px]">
              <span aria-hidden className="w-3 shrink-0 text-right text-[9px] text-hero-text-sub">
                {letter}
              </span>
              <div className="flex flex-1 gap-[3px]">
                {Array.from({ length: COL_COUNT }, (_, c) => {
                  const highlighted = inRow && c >= colStart && c <= colEnd;
                  return (
                    <span
                      key={c}
                      aria-hidden
                      className={`h-[9px] flex-1 rounded-[2px] transition-colors duration-300 ${
                        highlighted
                          ? weak
                            ? 'border border-dashed border-primary bg-transparent'
                            : 'bg-gradient-to-b from-primary to-primary-strong'
                          : 'bg-hero-soft'
                      }`}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <p className="m-0 mt-3 text-center text-[11px] text-hero-text-sub">
        실제 좌석 배치가 아니라 제보·추정 위치를 나타낸 개략도예요.
      </p>

      <div className="mt-5 border-t border-hero-border pt-4">
        <div className="flex flex-wrap items-center gap-1.5">
          {active.purposes.map((p) => (
            <span key={p} className="rounded-full border border-hero-border px-2.5 py-0.5 text-[12px] font-semibold text-accent">
              {SEAT_PURPOSE_LABELS[p] ?? p}
            </span>
          ))}
        </div>
        <p className="m-0 mt-2 text-[15px] font-semibold text-hero-text">
          {[active.rowRange, active.colRange].filter(Boolean).join(' ') || '전체'}
        </p>
        {active.rationale ? <p className="m-0 mt-1.5 text-[13.5px] leading-relaxed text-hero-text-sub">{active.rationale}</p> : null}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <TrustBadge status={active.infoStatus} observedAt={active.observedAt} />
          <span className="text-[12.5px] text-hero-text-sub">신뢰도 {pct(active.confidence)}</span>
          {active.sourceName ? <span className="text-[12.5px] text-hero-text-sub">· {active.sourceName}</span> : null}
        </div>
      </div>
    </div>
  );
}
