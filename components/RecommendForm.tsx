'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { MOTION_OPTIONS, ORIGIN_PRESETS, PRIORITY_OPTIONS } from '../src/data/constants';
import { readOnboardingState, type OnboardingAnswers } from '../src/lib/onboarding';
import { IconChevronRight } from './Icon';
import { SegmentedControl } from './SegmentedControl';
import { StepSection } from './StepSection';
import { ToggleCard } from './ToggleCard';

const inputCls =
  'min-h-[52px] w-full rounded-card border border-border bg-bg px-3.5 text-base text-text outline-none transition-shadow focus-visible:border-primary-strong focus-visible:ring-[3px] focus-visible:ring-primary-soft';
const selectCls = `${inputCls} appearance-none pr-10`;
const labelCls = 'block text-[15px] font-semibold text-text';

function SelectChevron() {
  return (
    <IconChevronRight aria-hidden className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 rotate-90 text-text-tertiary" />
  );
}

// 기본값이 채워져 있어 그대로 제출해도 추천을 받을 수 있다 (요구사항: 전부 입력 불필요)
export function RecommendForm({ movieId, defaultDate }: { movieId: number; defaultDate: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  // 온보딩 답변은 localStorage에만 있어 서버 렌더링 시점엔 알 수 없다 — 마운트 후 읽어와서
  // 적용한다. 이미 그려진 defaultValue/defaultChecked는 React가 재적용하지 않으므로, prefill이
  // 도착하면 key를 바꿔 해당 입력만 다시 마운트한다(초기 렌더와 하이드레이션은 항상 동일하게
  // 서버 기본값으로 그려지므로 하이드레이션 불일치는 생기지 않는다).
  const [prefill, setPrefill] = useState<OnboardingAnswers | null>(null);
  useEffect(() => {
    setPrefill(readOnboardingState()?.answers ?? null);
  }, []);
  const prefillKey = prefill ? 'prefilled' : 'initial';

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    const qs = new URLSearchParams({
      movieId: String(movieId),
      date: String(fd.get('date')),
      originId: String(fd.get('originId')),
      maxTravelMinutes: String(fd.get('maxTravelMinutes')),
      maxPrice: String(fd.get('maxPrice')),
      priority: String(fd.get('priority')),
      // 체크박스는 미체크 시 폼 데이터에 없으므로 명시적으로 true/false를 만든다
      allowImax: String(fd.get('allowImax') === 'on'),
      allowDolby: String(fd.get('allowDolby') === 'on'),
      allowStandard: String(fd.get('allowStandard') === 'on'),
      motionSickness: String(fd.get('motionSickness')),
      subtitleReadability: String(fd.get('subtitleReadability') === 'on'),
      neckComfort: String(fd.get('neckComfort') === 'on'),
      wheelchair: String(fd.get('wheelchair') === 'on'),
    });
    router.push(`/results?${qs.toString()}`);
  }

  return (
    <form onSubmit={onSubmit} aria-label="추천 조건 입력" className="flex flex-col pb-4">
      <StepSection step={1} title="언제, 어디서 볼까요?" first>
        <label className="block">
          <span className={labelCls}>관람 날짜</span>
          <input className={`${inputCls} mt-1.5`} type="date" name="date" defaultValue={defaultDate} required />
        </label>
        <label className="block">
          <span className={labelCls}>출발 위치</span>
          <div className="relative mt-1.5">
            <select className={selectCls} name="originId" defaultValue="cityhall">
              {ORIGIN_PRESETS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
            <SelectChevron />
          </div>
        </label>
        <label className="block">
          <span className={labelCls}>최대 이동 시간 (분)</span>
          <input
            className={`${inputCls} mt-1.5`}
            type="number"
            name="maxTravelMinutes"
            defaultValue={60}
            min={5}
            max={240}
            step={5}
          />
        </label>
        <label className="block">
          <span className={labelCls}>최대 가격 (원)</span>
          <input
            className={`${inputCls} mt-1.5`}
            type="number"
            name="maxPrice"
            defaultValue={40000}
            min={1000}
            max={200000}
            step={1000}
          />
        </label>
      </StepSection>

      <StepSection step={2} title="무엇을 가장 중요하게 보나요?">
        <SegmentedControl
          key={prefillKey}
          name="priority"
          legend="가장 중요한 것"
          options={PRIORITY_OPTIONS}
          defaultValue={prefill?.priority ?? 'balance'}
        />
        <fieldset className="m-0 border-0 p-0">
          <legend className="mb-2 block text-sm font-semibold text-text">허용할 상영 방식</legend>
          <div className="grid gap-2.5 sm:grid-cols-3">
            <ToggleCard name="allowImax" defaultChecked title="IMAX" description="더 큰 화면과 확장 화면비" />
            <ToggleCard name="allowDolby" defaultChecked title="Dolby Cinema" description="돌비 비전·애트모스 사운드" />
            <ToggleCard name="allowStandard" defaultChecked title="일반관" description="대형관 포함 일반 상영관" />
          </div>
        </fieldset>
      </StepSection>

      <StepSection step={3} title="피하고 싶은 조건이 있나요?">
        <SegmentedControl
          key={prefillKey}
          name="motionSickness"
          legend="4DX 멀미, 얼마나 신경 쓰이세요?"
          options={MOTION_OPTIONS}
          defaultValue={prefill?.motionSickness ?? '0'}
        />
        <fieldset className="m-0 border-0 p-0">
          <legend className="mb-2 block text-sm font-semibold text-text">좌석·편의 선호</legend>
          <div className="grid gap-2.5 sm:grid-cols-3">
            <ToggleCard
              key={prefillKey}
              name="subtitleReadability"
              defaultChecked={prefill?.subtitleReadability ?? false}
              title="자막 가독 우선"
              description="자막이 잘 보이는 구역을 먼저 추천"
            />
            <ToggleCard name="neckComfort" title="목 편한 좌석 우선" description="고개를 덜 들어도 되는 구역 우선" />
            <ToggleCard name="wheelchair" title="휠체어 접근 필수" description="확인 안 된 상영관은 제외돼요" />
          </div>
        </fieldset>
      </StepSection>

      <div
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur-md"
        style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
      >
        <div className="mx-auto max-w-content">
          <button
            type="submit"
            className="flex min-h-12 w-full items-center justify-center rounded-card bg-primary-strong text-base font-semibold text-white transition-colors hover:bg-primary-strong-hover disabled:opacity-60"
            disabled={submitting}
          >
            {submitting ? '추천 계산 중…' : '추천 받기'}
          </button>
          <span className="sr-only" role="status" aria-live="polite">
            {submitting ? '추천을 계산하고 있습니다. 잠시만 기다려 주세요.' : ''}
          </span>
        </div>
      </div>
    </form>
  );
}
