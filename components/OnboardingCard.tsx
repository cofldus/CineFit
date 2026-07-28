'use client';

import { useState } from 'react';
import { MOTION_OPTIONS, PRIORITY_OPTIONS } from '../src/data/constants';
import { readOnboardingState, writeOnboardingState, type OnboardingAnswers } from '../src/lib/onboarding';
import { SegmentedControl } from './SegmentedControl';

const checkboxCls = 'h-5 w-5 accent-primary';

// 3문항짜리 가벼운 온보딩 — 답은 이 브라우저에만 남고(localStorage), 추천 폼 기본값을 채우는
// 데만 쓰인다. 건너뛰어도 추천 폼 기본값은 그대로 동작하므로 필수가 아니다.
export function OnboardingCard() {
  const [done, setDone] = useState(() => readOnboardingState() !== null);

  if (done) return null;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    writeOnboardingState({
      status: 'answered',
      answers: {
        priority: String(fd.get('priority')) as OnboardingAnswers['priority'],
        motionSickness: String(fd.get('motionSickness')) as OnboardingAnswers['motionSickness'],
        subtitleReadability: fd.get('subtitleReadability') === 'on',
      },
    });
    setDone(true);
  }

  function handleSkip() {
    writeOnboardingState({ status: 'skipped', answers: null });
    setDone(true);
  }

  return (
    <section
      aria-label="간단한 취향 안내"
      className="mt-4 max-w-content rounded-card-lg border border-border bg-surface p-4"
    >
      <h2 className="m-0 text-base font-bold text-text">세 가지만 알려주시면 기본값을 맞춰드려요</h2>
      <p className="mt-1 text-sm text-text-sub">언제든 추천 조건 입력 화면에서 다시 바꿀 수 있어요.</p>
      <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-3.5">
        <SegmentedControl name="priority" legend="가장 중요하게 보는 것은?" options={PRIORITY_OPTIONS} defaultValue="balance" />
        <SegmentedControl
          name="motionSickness"
          legend="4DX 멀미, 얼마나 신경 쓰이세요?"
          options={MOTION_OPTIONS}
          defaultValue="0"
        />
        <label className="flex min-h-11 items-center gap-2.5 text-[15px] text-text">
          <input className={checkboxCls} type="checkbox" name="subtitleReadability" /> 자막이 잘 보이는 좌석을
          선호해요
        </label>
        <div className="flex gap-2">
          <button
            type="submit"
            className="min-h-11 flex-1 rounded-card bg-primary-strong px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-strong-hover"
          >
            저장하고 시작
          </button>
          <button
            type="button"
            onClick={handleSkip}
            className="min-h-11 rounded-card border border-border px-4 text-sm font-medium text-text-sub hover:bg-bg"
          >
            건너뛰기
          </button>
        </div>
      </form>
    </section>
  );
}
