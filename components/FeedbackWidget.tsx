'use client';

import { useState } from 'react';
import {
  FEEDBACK_REASONS,
  FEEDBACK_REASON_LABELS,
  HELPFULNESS_LABELS,
  HELPFULNESS_LEVELS,
} from '../src/lib/feedbackValidation';

type Phase = 'idle' | 'sheet' | 'submitting' | 'done' | 'error';
type Level = (typeof HELPFULNESS_LEVELS)[number];

/**
 * 대표 추천에 대한 도움 정도 피드백 — 결과 페이지에서는 "이 추천이 도움이 됐나요?" 질문과
 * 버튼 2개(도움됐어요/아쉬워요)만 먼저 노출하고, 누르면 하단 시트(bottom sheet)가 열려
 * 세부 단계(5단계 도움 정도 조정)와 이유 선택을 받는다. 시트의 5단계 칩은 처음 누른 버튼에
 * 맞는 값으로 미리 선택돼 있어 그대로 제출해도 되고, 조정할 수도 있다 — 저장되는 데이터
 * 스키마(helpfulness 5단계 + reasons)는 그대로라 관리자 실패 원인 분류 집계도 그대로
 * 동작한다.
 */
export function FeedbackWidget({ runId, showtimeId }: { runId: number; showtimeId: number }) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [helpfulness, setHelpfulness] = useState<Level | null>(null);
  const [reasons, setReasons] = useState<string[]>([]);

  function open(initial: Level) {
    setHelpfulness(initial);
    setPhase('sheet');
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

  const sheetOpen = phase === 'sheet' || phase === 'submitting' || phase === 'error';

  return (
    <div>
      <p className="m-0 text-[15px] font-semibold text-text">이 추천이 도움이 됐나요?</p>
      <div className="mt-2.5 flex gap-2" role="group" aria-label="도움 정도">
        <button
          type="button"
          onClick={() => open('somewhat_helpful')}
          aria-pressed={sheetOpen && helpfulness !== null && helpfulness !== 'not_very_helpful' && helpfulness !== 'not_helpful'}
          className="min-h-11 rounded-card border border-border px-5 text-sm font-semibold text-text transition-colors hover:border-primary"
        >
          도움됐어요
        </button>
        <button
          type="button"
          onClick={() => open('not_very_helpful')}
          aria-pressed={sheetOpen && (helpfulness === 'not_very_helpful' || helpfulness === 'not_helpful')}
          className="min-h-11 rounded-card border border-border px-5 text-sm font-semibold text-text-sub transition-colors hover:border-primary hover:text-text"
        >
          아쉬워요
        </button>
      </div>

      {sheetOpen ? (
        <>
          {/* 배경 딤 — 클릭하면 시트가 닫힌다(제출 전 데이터는 아직 전송되지 않음). */}
          <button
            type="button"
            aria-label="세부 피드백 닫기"
            onClick={() => setPhase('idle')}
            className="fixed inset-0 z-40 cursor-default bg-black/50"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="세부 피드백"
            className="fixed inset-x-0 bottom-0 z-50 rounded-t-card-xl border-t border-border bg-surface px-5 pb-6 pt-4 shadow-float sm:mx-auto sm:max-w-content"
            style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
          >
            <span aria-hidden className="mx-auto block h-1 w-10 rounded-full bg-border-strong" />
            <p className="m-0 mt-3 text-[15px] font-bold text-text">조금만 더 알려주세요 (선택)</p>

            <p className="m-0 mt-3 text-xs font-semibold text-text-sub">얼마나 도움이 됐나요?</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5" role="group" aria-label="도움 정도 세부">
              {HELPFULNESS_LEVELS.map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setHelpfulness(level)}
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

            <p className="m-0 mt-3 text-xs font-semibold text-text-sub">해당하는 이유가 있으면 골라주세요</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5" role="group" aria-label="이유">
              {FEEDBACK_REASONS.map((r) => (
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
                  {FEEDBACK_REASON_LABELS[r]}
                </label>
              ))}
            </div>

            {phase === 'error' ? (
              <p role="alert" className="mt-2.5 text-xs text-trust-low">
                제출에 실패했어요. 잠시 후 다시 시도해 주세요.
              </p>
            ) : null}

            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                onClick={submit}
                disabled={phase === 'submitting'}
                className="min-h-11 flex-1 rounded-card bg-primary-strong px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-strong-hover disabled:opacity-60"
              >
                {phase === 'submitting' ? '제출 중…' : '피드백 보내기'}
              </button>
              <button
                type="button"
                onClick={() => setPhase('idle')}
                className="min-h-11 rounded-card border border-border px-4 text-sm font-medium text-text-sub hover:text-text"
              >
                닫기
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
