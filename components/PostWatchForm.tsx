'use client';

import { useState } from 'react';

type Phase = 'editing' | 'submitting' | 'done' | 'error';

const QUESTIONS = [
  { key: 'overallSatisfaction', label: '실제 관람 만족도', required: true },
  { key: 'infoAccuracy', label: '상영관 정보 정확도', required: false },
  { key: 'seatSatisfaction', label: '좌석 추천 만족도', required: false },
  { key: 'screenSatisfaction', label: '화면 만족도', required: false },
  { key: 'soundSatisfaction', label: '사운드 만족도', required: false },
  { key: 'travelTimeAccuracy', label: '이동 시간 정확도', required: false },
  { key: 'priceAccuracy', label: '가격 정확도', required: false },
  { key: 'wouldChooseAgain', label: '다시 이 상영관을 선택할 의향', required: false },
  { key: 'wouldReuseCinefit', label: 'CineFit 추천을 다시 사용할 의향', required: false },
] as const;

const SCALE_LABELS = ['매우 낮음', '낮음', '보통', '높음', '매우 높음'];

export function PostWatchForm({ runId }: { runId: number }) {
  const [phase, setPhase] = useState<Phase>('editing');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, number>>({});

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!values.overallSatisfaction) return;
    setPhase('submitting');
    const res = await fetch(`/api/recommendations/${runId}/post-watch`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(values),
    });
    if (res.ok) {
      setPhase('done');
    } else {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setErrorMsg(body.error ?? '제출에 실패했어요.');
      setPhase('error');
    }
  }

  if (phase === 'done') {
    return (
      <div role="status" className="rounded-card-lg border border-trust-high/40 bg-trust-high/10 p-5">
        <h2 className="m-0 text-lg font-bold text-text">평가가 저장됐어요</h2>
        <p className="mt-2 text-sm text-text-sub">관람해 주셔서, 그리고 알려주셔서 감사합니다.</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} aria-label="관람 후 만족도" className="flex flex-col gap-4">
      {phase === 'error' ? (
        <p role="alert" className="rounded-card border border-trust-low/40 bg-trust-low/10 px-4 py-3 text-sm text-text">
          {errorMsg}
        </p>
      ) : null}
      {QUESTIONS.map((q) => (
        <fieldset key={q.key} className="rounded-card-lg border border-border bg-surface p-4">
          <legend className="mb-2 px-0.5 text-sm font-semibold text-text">
            {q.label}
            {q.required ? <span className="text-trust-low"> *</span> : null}
          </legend>
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={q.label}>
            {[1, 2, 3, 4, 5].map((n) => (
              <label
                key={n}
                className="flex min-h-10 min-w-10 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-card border border-border px-2 text-center text-xs text-text-sub has-[:checked]:border-primary-strong has-[:checked]:bg-primary-strong has-[:checked]:text-white"
              >
                <input
                  type="radio"
                  name={q.key}
                  value={n}
                  required={q.required}
                  checked={values[q.key] === n}
                  onChange={() => setValues((prev) => ({ ...prev, [q.key]: n }))}
                  className="sr-only"
                />
                {n}
              </label>
            ))}
          </div>
          <p className="mt-1 text-[11px] text-text-sub">
            {SCALE_LABELS[0]} 1 — 5 {SCALE_LABELS[4]}
          </p>
        </fieldset>
      ))}
      <button
        type="submit"
        disabled={phase === 'submitting' || !values.overallSatisfaction}
        className="flex min-h-12 w-full items-center justify-center rounded-card bg-primary-strong text-base font-semibold text-white transition-colors hover:bg-primary-strong-hover disabled:opacity-60"
      >
        {phase === 'submitting' ? '제출 중…' : '평가 제출'}
      </button>
    </form>
  );
}
