'use client';

import { useState } from 'react';
import {
  FEEDBACK_REASONS,
  FEEDBACK_REASON_LABELS,
  HELPFULNESS_LABELS,
  HELPFULNESS_LEVELS,
} from '../src/lib/feedbackValidation';

type Phase = 'idle' | 'reasons' | 'submitting' | 'done' | 'error';

/**
 * 대표 추천에 대한 도움 정도 피드백 — 예전에는 카드 3개마다 반복해서 물었지만("이 추천,
 * 어땠나요?"가 셋), 지금은 결과 페이지 전체에서 대표 추천 하나에 대해서만, 페이지 하단
 * 피드백 섹션 안에서 한 번만 묻는다(실제 선택 여부를 묻는 SelectionWidget과 같은 섹션에
 * 나란히 둔다). 관리자 데이터 품질 대시보드의 "실패 원인 분류" 집계가 이 데이터를 그대로
 * 쓰므로 기능 자체는 유지하고, 반복되던 UI 자리만 없앴다.
 */
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
      <p role="status" className="m-0 text-sm text-text-sub">
        피드백 감사합니다 — 추천 품질 개선에 반영할게요.
      </p>
    );
  }

  return (
    <details>
      <summary className="flex min-h-11 cursor-pointer items-center text-sm font-medium text-text-sub">
        대표 추천이 도움이 되었나요?
      </summary>

      <div className="mt-2.5">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="도움 정도">
          {HELPFULNESS_LEVELS.map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => pick(level)}
              aria-pressed={helpfulness === level}
              className={`min-h-9 rounded-full border px-3 text-xs font-medium transition-colors ${
                helpfulness === level
                  ? 'border-primary-strong bg-primary-strong text-white'
                  : 'border-border text-text-sub hover:text-text'
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
                  className="flex min-h-8 cursor-pointer items-center gap-1 rounded-full border border-border px-2.5 text-xs text-text-sub has-[:checked]:border-primary-strong has-[:checked]:text-primary-strong"
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
    </details>
  );
}
