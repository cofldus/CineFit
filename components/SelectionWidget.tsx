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

/**
 * 추천을 "봤다"는 사실과 실제 "선택"을 구분해 기록한다 — 예매 링크 클릭만으로는 알 수 없다.
 * 결과 페이지 전체에서 사용자에게 묻는 질문은 이것 하나뿐이다 — 카드마다 반복하던
 * "이 추천, 어땠나요?"는 없앴고, 페이지 맨 아래 이 질문 하나로 통합했다.
 */
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
      <div className="border-t border-border pt-6" role="status">
        <p className="m-0 text-sm text-text-sub">알려주셔서 감사합니다 — 실제 선택 결과는 추천 품질 개선에 활용됩니다.</p>
      </div>
    );
  }

  return (
    <div className="border-t border-border pt-6">
      <h2 className="m-0 text-xl font-bold text-text">선택을 도와드렸나요?</h2>
      <p className="mt-2 text-sm text-text-sub">
        실제로 고른 상영관을 알려주시면 추천 품질 개선에 활용됩니다. 예매 페이지로 이동했는지와는 별개예요.
      </p>
      <div className="mt-4 flex flex-col gap-2" role="radiogroup" aria-label="실제 선택">
        {picks.map((p) => {
          const value = `picked:${p.auditoriumId}`;
          const selected = choice === value;
          return (
            <label
              key={p.auditoriumId}
              className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-card-lg border px-4 text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-surface ${
                selected ? 'border-primary-strong bg-primary-soft text-text' : 'border-border text-text hover:border-border-strong'
              }`}
            >
              <input
                type="radio"
                name="selection"
                value={value}
                checked={selected}
                onChange={(e) => setChoice(e.target.value)}
                className="sr-only"
              />
              <span
                aria-hidden
                className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 ${selected ? 'border-primary-strong' : 'border-border-strong'}`}
              >
                {selected ? <span className="h-2 w-2 rounded-full bg-primary-strong" /> : null}
              </span>
              {SELECTION_TYPE_LABELS.picked_recommended} — {p.auditoriumLabel} ({p.pickLabel})
            </label>
          );
        })}
        {(['picked_other_candidate', 'picked_outside', 'undecided', 'cancelled'] as const).map((t) => {
          const selected = choice === t;
          return (
            <label
              key={t}
              className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-card-lg border px-4 text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-surface ${
                selected ? 'border-primary-strong bg-primary-soft text-text' : 'border-border text-text hover:border-border-strong'
              }`}
            >
              <input
                type="radio"
                name="selection"
                value={t}
                checked={selected}
                onChange={(e) => setChoice(e.target.value)}
                className="sr-only"
              />
              <span
                aria-hidden
                className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 ${selected ? 'border-primary-strong' : 'border-border-strong'}`}
              >
                {selected ? <span className="h-2 w-2 rounded-full bg-primary-strong" /> : null}
              </span>
              {SELECTION_TYPE_LABELS[t]}
            </label>
          );
        })}
      </div>

      {choice ? (
        <div className="mt-4">
          <p className="m-0 text-xs text-text-sub">선택한 이유가 있으면 골라주세요 (선택)</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5" role="group" aria-label="선택 이유">
            {SELECTION_REASONS.map((r) => (
              <label
                key={r}
                className="flex min-h-8 cursor-pointer items-center gap-1 rounded-full border border-border px-2.5 text-xs text-text-sub has-[:checked]:border-primary has-[:checked]:text-primary"
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
            className="mt-3 flex min-h-10 items-center justify-center rounded-card bg-primary-strong px-4 text-sm font-semibold text-white disabled:opacity-60"
          >
            {phase === 'submitting' ? '제출 중…' : '선택 결과 남기기'}
          </button>
        </div>
      ) : null}
    </div>
  );
}
