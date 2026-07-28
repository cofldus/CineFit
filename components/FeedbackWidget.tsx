'use client';

import { useState } from 'react';
import {
  FEEDBACK_REASONS,
  FEEDBACK_REASON_LABELS,
  HELPFULNESS_LABELS,
  HELPFULNESS_LEVELS,
} from '../src/lib/feedbackValidation';

type Phase = 'idle' | 'reasons' | 'submitting' | 'done' | 'error';

/** 추천 카드 하나에 대한 즉시 피드백 — 도움 됨 5단계 선택 후에만 이유 칩이 펼쳐진다. */
export function FeedbackWidget({ runId, showtimeId }: { runId: number; showtimeId: number }) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [helpfulness, setHelpfulness] = useState<(typeof HELPFULNESS_LEVELS)[number] | null>(null);
  const [reasons, setReasons] = useState<string[]>([]);

  function pick(level: (typeof HELPFULNESS_LEVELS)[number]) {
    setHelpfulness(level);
    setPhase('reasons');
  }

  async function submit() {
    if (!helpfulness) return;
    setPhase('submitting');
    const res = await fetch(`/api/recommendations/${runId}/feedback`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ showtimeId, helpfulness, reasons }),
    });
    setPhase(res.ok ? 'done' : 'error');
  }

  if (phase === 'done') {
    return (
      <p role="status" className="mt-3 border-t border-border pt-3 text-sm text-text-sub">
        피드백 감사합니다 — 추천 품질 개선에 반영할게요.
      </p>
    );
  }

  return (
    <div className="mt-3 border-t border-border pt-3">
      <p className="m-0 text-sm font-semibold text-text">이 추천이 선택에 도움이 되었나요?</p>
      <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="도움 정도">
        {HELPFULNESS_LEVELS.map((level) => (
          <button
            key={level}
            type="button"
            onClick={() => pick(level)}
            aria-pressed={helpfulness === level}
            className={`min-h-9 rounded-full border px-3 text-xs font-medium transition-colors ${
              helpfulness === level
                ? 'border-primary-strong bg-primary-strong text-white'
                : 'border-border bg-bg text-text-sub hover:text-text'
            }`}
          >
            {HELPFULNESS_LABELS[level]}
          </button>
        ))}
      </div>

      {phase === 'reasons' || phase === 'submitting' || phase === 'error' ? (
        <div className="mt-2.5">
          <p className="m-0 text-xs text-text-sub">해당하는 이유가 있으면 골라주세요 (선택)</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5" role="group" aria-label="이유">
            {FEEDBACK_REASONS.map((r) => (
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
                {FEEDBACK_REASON_LABELS[r]}
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
            className="mt-2.5 min-h-9 rounded-card bg-primary-strong px-4 text-xs font-semibold text-white disabled:opacity-60"
          >
            {phase === 'submitting' ? '제출 중…' : '피드백 보내기'}
          </button>
        </div>
      ) : null}
    </div>
  );
}
