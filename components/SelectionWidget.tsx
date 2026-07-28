'use client';

import { useState } from 'react';
import {
  SELECTION_REASONS,
  SELECTION_REASON_LABELS,
  SELECTION_TYPE_LABELS,
} from '../src/lib/feedbackValidation';

type Phase = 'idle' | 'submitting' | 'done' | 'error';

interface PickOption {
  auditoriumId: number;
  auditoriumLabel: string;
  pickLabel: string;
}

/** 추천을 "봤다"는 사실과 실제 "선택"을 구분해 기록한다 — 예매 링크 클릭만으로는 알 수 없다. */
export function SelectionWidget({ runId, picks }: { runId: number; picks: PickOption[] }) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [choice, setChoice] = useState<string>('');
  const [reasons, setReasons] = useState<string[]>([]);

  async function submit() {
    if (!choice) return;
    setPhase('submitting');
    const picked = picks.find((p) => choice === `picked:${p.auditoriumId}`);
    const body = picked
      ? { selectionType: 'picked_recommended', auditoriumId: picked.auditoriumId, reasons }
      : { selectionType: choice, reasons };
    const res = await fetch(`/api/recommendations/${runId}/selection`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    setPhase(res.ok ? 'done' : 'error');
  }

  if (phase === 'done') {
    return (
      <div className="mt-6 max-w-content rounded-card-lg border border-border bg-surface p-4" role="status">
        <p className="m-0 text-sm text-text-sub">알려주셔서 감사합니다 — 실제 선택 결과는 추천 품질 검증에 쓰여요.</p>
      </div>
    );
  }

  return (
    <div className="mt-6 max-w-content rounded-card-lg border border-border bg-surface p-4">
      <h2 className="m-0 text-base font-bold text-text">실제로 어떤 상영관을 선택하셨나요?</h2>
      <p className="mt-1 text-sm text-text-sub">예매 페이지로 이동했는지와 별개로, 실제 선택을 알려주시면 추천이 맞았는지 확인하는 데 도움이 돼요.</p>
      <div className="mt-3 flex flex-col gap-1.5" role="radiogroup" aria-label="실제 선택">
        {picks.map((p) => (
          <label key={p.auditoriumId} className="flex min-h-10 cursor-pointer items-center gap-2 text-sm text-text">
            <input
              type="radio"
              name="selection"
              value={`picked:${p.auditoriumId}`}
              checked={choice === `picked:${p.auditoriumId}`}
              onChange={(e) => setChoice(e.target.value)}
              className="h-4 w-4 accent-primary"
            />
            {SELECTION_TYPE_LABELS.picked_recommended} — {p.auditoriumLabel} ({p.pickLabel})
          </label>
        ))}
        {(['picked_other_candidate', 'picked_outside', 'undecided', 'cancelled'] as const).map((t) => (
          <label key={t} className="flex min-h-10 cursor-pointer items-center gap-2 text-sm text-text">
            <input
              type="radio"
              name="selection"
              value={t}
              checked={choice === t}
              onChange={(e) => setChoice(e.target.value)}
              className="h-4 w-4 accent-primary"
            />
            {SELECTION_TYPE_LABELS[t]}
          </label>
        ))}
      </div>

      {choice ? (
        <div className="mt-3">
          <p className="m-0 text-xs text-text-sub">선택한 이유가 있으면 골라주세요 (선택)</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5" role="group" aria-label="선택 이유">
            {SELECTION_REASONS.map((r) => (
              <label
                key={r}
                className="flex min-h-8 cursor-pointer items-center gap-1 rounded-full border border-border px-2.5 text-xs text-text-sub has-[:checked]:border-accent has-[:checked]:text-accent"
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={reasons.includes(r)}
                  onChange={(e) => setReasons((prev) => (e.target.checked ? [...prev, r] : prev.filter((x) => x !== r)))}
                />
                {SELECTION_REASON_LABELS[r]}
              </label>
            ))}
          </div>
          {phase === 'error' ? (
            <p role="alert" className="mt-2 text-xs text-trust-low">
              제출에 실패했어요. 잠시 후 다시 시도해 주세요.
            </p>
          ) : null}
          <button
            type="button"
            onClick={submit}
            disabled={phase === 'submitting'}
            className="mt-2.5 flex min-h-10 items-center justify-center rounded-card bg-primary-strong px-4 text-sm font-semibold text-white disabled:opacity-60"
          >
            {phase === 'submitting' ? '제출 중…' : '알려주기'}
          </button>
        </div>
      ) : null}
    </div>
  );
}
