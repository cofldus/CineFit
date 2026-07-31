'use client';

import { useState } from 'react';
import { RatingSelector } from './RatingSelector';

type Phase = 'editing' | 'submitting' | 'done' | 'error';

const OPTIONAL_QUESTIONS = [
  { key: 'infoAccuracy', label: '상영관 정보 정확도' },
  { key: 'seatSatisfaction', label: '좌석 추천 만족도' },
  { key: 'screenSatisfaction', label: '화면 만족도' },
  { key: 'soundSatisfaction', label: '사운드 만족도' },
  { key: 'travelTimeAccuracy', label: '이동 시간 정확도' },
  { key: 'priceAccuracy', label: '가격 정확도' },
  { key: 'wouldChooseAgain', label: '다시 이 상영관을 선택할 의향' },
  { key: 'wouldReuseCinefit', label: 'CineFit 추천을 다시 사용할 의향' },
] as const;

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
    <form onSubmit={onSubmit} aria-label="관람 후 만족도" className="flex flex-col">
      {phase === 'error' ? (
        <p role="alert" className="mb-4 rounded-card border border-trust-low/40 bg-trust-low/10 px-4 py-3 text-sm text-text">
          {errorMsg}
        </p>
      ) : null}

      <p className="m-0 text-xs text-text-tertiary">1 — 매우 낮음 · 5 — 매우 높음</p>

      <div className="border-b border-border pb-1">
        <RatingSelector
          name="overallSatisfaction"
          label="실제 관람 만족도"
          required
          size="lg"
          value={values.overallSatisfaction}
          onChange={(n) => setValues((prev) => ({ ...prev, overallSatisfaction: n }))}
        />
      </div>

      <div className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
        {OPTIONAL_QUESTIONS.map((q) => (
          <RatingSelector
            key={q.key}
            name={q.key}
            label={q.label}
            value={values[q.key]}
            onChange={(n) => setValues((prev) => ({ ...prev, [q.key]: n }))}
          />
        ))}
      </div>

      <button
        type="submit"
        disabled={phase === 'submitting' || !values.overallSatisfaction}
        className="mt-6 flex min-h-12 w-full items-center justify-center rounded-card bg-primary-strong text-base font-semibold text-white transition-colors hover:bg-primary-strong-hover disabled:opacity-60"
      >
        {phase === 'submitting' ? '제출 중…' : '평가 제출'}
      </button>
    </form>
  );
}
