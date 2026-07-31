'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { MOTION_OPTIONS, ORIGIN_PRESETS, PRIORITY_OPTIONS } from '../src/data/constants';
import { readOnboardingState, type OnboardingAnswers } from '../src/lib/onboarding';
import { IconChevronRight } from './Icon';
import { SegmentedControl } from './SegmentedControl';
import { StepSection } from './StepSection';
import { ToggleCard } from './ToggleCard';

// 채움형 필드 — 검은 배경 위 테두리 박스 대신, 아이콘 타일 + 라벨이 안에 들어간 raised
// 서피스. 포커스 시 얇은 와인 인셋 라인이 켜지고 아이콘 타일도 로즈로 점등된다(선택
// 컨트롤과 같은 언어). [color-scheme:dark]로 네이티브 달력·스피너 아이콘도 다크로 맞춘다.
const fieldCls =
  'group flex min-h-[64px] w-full items-center gap-3 rounded-card bg-surface-raised px-3.5 py-2.5 transition-shadow focus-within:shadow-[inset_0_0_0_1px_rgba(188,96,118,0.5)]';
const fieldLabelCls = 'text-[12px] font-semibold text-text-sub';
const fieldInputCls =
  'm-0 w-full border-0 bg-transparent p-0 text-[15.5px] font-medium text-text outline-none [color-scheme:dark] placeholder:text-text-tertiary';

// 필드 왼쪽 아이콘 타일 — 기본은 차분한 회색, 포커스 시 로즈 점등(아이콘 배경 발광 반복
// 금지 원칙에 맞춰 아주 옅은 틴트만).
function FieldIcon({ children }: { children: React.ReactNode }) {
  return (
    <span
      aria-hidden
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-white/[0.04] text-text-tertiary transition-colors group-focus-within:bg-primary-soft group-focus-within:text-primary"
    >
      {children}
    </span>
  );
}

const glyphProps = {
  viewBox: '0 0 20 20',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

function CalendarGlyph() {
  return (
    <svg {...glyphProps} className="h-[18px] w-[18px]">
      <rect x="3" y="4.5" width="14" height="12" rx="2" />
      <path d="M3 8.5h14M7 2.5v3M13 2.5v3" />
    </svg>
  );
}

function PinGlyph() {
  return (
    <svg {...glyphProps} className="h-[18px] w-[18px]">
      <path d="M10 17.5s-5.5-4.6-5.5-8.6a5.5 5.5 0 1 1 11 0c0 4-5.5 8.6-5.5 8.6Z" />
      <circle cx="10" cy="8.7" r="1.9" />
    </svg>
  );
}

function ClockGlyph() {
  return (
    <svg {...glyphProps} className="h-[18px] w-[18px]">
      <circle cx="10" cy="10" r="7" />
      <path d="M10 6.2V10l2.6 1.8" />
    </svg>
  );
}

function WonGlyph() {
  return (
    <svg {...glyphProps} className="h-[18px] w-[18px]">
      <path d="M3 6.5l2.4 7 2.3-7 2.3 7 2.3-7 2.3 7 2.4-7" />
      <path d="M2.5 10.5h15" />
    </svg>
  );
}

function SelectChevron() {
  return (
    <IconChevronRight aria-hidden className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 rotate-90 text-text-tertiary" />
  );
}

const STEP_TITLES = ['언제, 어디서 볼까요?', '무엇을 가장 중요하게 보나요?', '피하고 싶은 조건이 있나요?'];

// 토글 카드용 미니 스크린 일러스트 — 포맷마다 실제 화면비 모양(IMAX는 1.43:1로 세로가 큼,
// 돌비는 음파 링, 일반관은 1.85:1)을 그대로 보여준다. CineFit 시그니처 그래픽 언어를
// 폼 컨트롤 안까지 일관되게 유지하는 의도.
function ScreenGlyph({ ratio, wave }: { ratio: number; wave?: boolean }) {
  return (
    <span className="relative flex h-full w-full items-center justify-center">
      {wave ? (
        <>
          <span className="absolute h-9 w-12 rounded-[7px] border border-[#bc6076]/25" />
          <span className="absolute h-11 w-14 rounded-[9px] border border-[#bc6076]/15" />
        </>
      ) : null}
      <span
        className="relative overflow-hidden rounded-[4px] border border-white/15"
        style={{
          width: ratio < 1.6 ? '30px' : '40px',
          aspectRatio: `${ratio} / 1`,
          background: 'linear-gradient(180deg, rgba(93, 24, 40, 0.5), rgba(36, 28, 31, 0.95))',
        }}
      >
        <span
          className="absolute inset-x-0.5 top-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(201, 111, 132, 0.9), transparent)' }}
        />
      </span>
    </span>
  );
}

// 토글 카드용 미니 좌석 그리드 — 옵션이 우선하는 구역만 로즈로 점등된 4×7 좌석 점.
// 상영관 상세의 좌석 맵과 같은 시각 언어의 축소판이며, 정확한 좌석이 아니라 의미 안내용.
function SeatGlyph({ lit }: { lit: (r: number, c: number) => boolean }) {
  return (
    <span className="flex flex-col gap-[3px]">
      {Array.from({ length: 4 }, (_, r) => (
        <span key={r} className="flex justify-center gap-[3px]">
          {Array.from({ length: 7 }, (_, c) => (
            <span
              key={c}
              className={`h-[5px] w-[5px] rounded-[1.5px] ${lit(r, c) ? 'bg-primary' : 'bg-white/15'}`}
            />
          ))}
        </span>
      ))}
    </span>
  );
}

// 기본값이 채워져 있어 그대로 제출해도 추천을 받을 수 있다 (요구사항: 전부 입력 불필요).
// 긴 한 페이지 폼 대신 3단계 guided flow — 단계는 화면에 하나씩만 보이지만 세 단계 입력이
// 전부 같은 <form> 안에 마운트돼 있어(비활성 단계는 hidden) 최종 제출 페이로드는 이전과
// 완전히 동일하다. Enter 제출도 마지막 단계 전에는 다음 단계로만 이동한다.
export function RecommendForm({ movieId, defaultDate }: { movieId: number; defaultDate: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(0);
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
    // 마지막 단계 전의 Enter/제출은 다음 단계로만 이동
    if (step < 2) {
      setStep((s) => s + 1);
      return;
    }
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
      {/* 진행 표시 — 현재 단계는 와인 채움, 지나온 단계는 로즈 텍스트. */}
      <ol className="m-0 mb-6 flex list-none items-center gap-2 p-0" aria-label="입력 단계">
        {STEP_TITLES.map((t, i) => (
          <li key={t} className="flex min-w-0 items-center gap-2">
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                i === step ? 'bg-primary-strong text-white' : i < step ? 'bg-primary-soft text-primary' : 'bg-surface-strong text-text-tertiary'
              }`}
              aria-current={i === step ? 'step' : undefined}
            >
              {i + 1}
            </span>
            <span className={`hidden truncate text-[13px] sm:block ${i === step ? 'font-semibold text-text' : 'text-text-tertiary'}`}>
              {t}
            </span>
            {i < STEP_TITLES.length - 1 ? <span aria-hidden className="h-px w-4 shrink-0 bg-border sm:w-6" /> : null}
          </li>
        ))}
      </ol>

      <div className={step === 0 ? 'stage-enter' : 'hidden'}>
      <StepSection step={1} title="언제, 어디서 볼까요?" first>
        <div className="grid gap-2.5 sm:grid-cols-2">
          <label className={fieldCls}>
            <FieldIcon>
              <CalendarGlyph />
            </FieldIcon>
            <span className="min-w-0 flex-1">
              <span className={fieldLabelCls}>관람 날짜</span>
              <input className={`${fieldInputCls} mt-0.5`} type="date" name="date" defaultValue={defaultDate} required />
            </span>
          </label>
          <label className={`${fieldCls} relative`}>
            <FieldIcon>
              <PinGlyph />
            </FieldIcon>
            <span className="min-w-0 flex-1">
              <span className={fieldLabelCls}>출발 위치</span>
              <select className={`${fieldInputCls} mt-0.5 appearance-none pr-8`} name="originId" defaultValue="cityhall">
                {ORIGIN_PRESETS.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </span>
            <SelectChevron />
          </label>
          <label className={fieldCls}>
            <FieldIcon>
              <ClockGlyph />
            </FieldIcon>
            <span className="min-w-0 flex-1">
              <span className={fieldLabelCls}>최대 이동 시간 (분)</span>
              <input
                className={`${fieldInputCls} mt-0.5`}
                type="number"
                name="maxTravelMinutes"
                defaultValue={60}
                min={5}
                max={240}
                step={5}
              />
            </span>
          </label>
          <label className={fieldCls}>
            <FieldIcon>
              <WonGlyph />
            </FieldIcon>
            <span className="min-w-0 flex-1">
              <span className={fieldLabelCls}>최대 가격 (원)</span>
              <input
                className={`${fieldInputCls} mt-0.5`}
                type="number"
                name="maxPrice"
                defaultValue={40000}
                min={1000}
                max={200000}
                step={1000}
              />
            </span>
          </label>
        </div>
      </StepSection>
      </div>

      <div className={step === 1 ? 'stage-enter' : 'hidden'}>
      <StepSection step={2} title="무엇을 가장 중요하게 보나요?" first>
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
            <ToggleCard
              name="allowImax"
              defaultChecked
              title="IMAX"
              description="더 큰 화면과 확장 화면비"
              visual={<ScreenGlyph ratio={1.43} />}
            />
            <ToggleCard
              name="allowDolby"
              defaultChecked
              title="Dolby Cinema"
              description="돌비 비전·애트모스 사운드"
              visual={<ScreenGlyph ratio={2.2} wave />}
            />
            <ToggleCard
              name="allowStandard"
              defaultChecked
              title="일반관"
              description="대형관 포함 일반 상영관"
              visual={<ScreenGlyph ratio={1.85} />}
            />
          </div>
        </fieldset>
      </StepSection>
      </div>

      <div className={step === 2 ? 'stage-enter' : 'hidden'}>
      <StepSection step={3} title="피하고 싶은 조건이 있나요?" first>
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
              visual={<SeatGlyph lit={(r, c) => r === 1 && c >= 2 && c <= 4} />}
            />
            <ToggleCard
              name="neckComfort"
              title="목 편한 좌석 우선"
              description="고개를 덜 들어도 되는 구역 우선"
              visual={<SeatGlyph lit={(r, c) => r === 3 && c >= 2 && c <= 4} />}
            />
            <ToggleCard
              name="wheelchair"
              title="휠체어 접근 필수"
              description="확인 안 된 상영관은 제외돼요"
              visual={<SeatGlyph lit={(r, c) => r === 3 && c <= 1} />}
            />
          </div>
        </fieldset>
      </StepSection>
      </div>

      <div
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur-md"
        style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
      >
        <div className="mx-auto flex max-w-content items-center gap-3">
          {step > 0 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="min-h-12 shrink-0 rounded-card border border-border px-5 text-[15px] font-medium text-text-sub transition-colors hover:text-text"
            >
              이전
            </button>
          ) : null}
          {step < 2 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              className="flex min-h-12 flex-1 items-center justify-center rounded-card bg-primary-strong text-base font-semibold text-white transition-colors hover:bg-primary-strong-hover"
            >
              다음
            </button>
          ) : (
            <button
              type="submit"
              className="flex min-h-12 flex-1 items-center justify-center rounded-card bg-primary-strong text-base font-semibold text-white transition-colors hover:bg-primary-strong-hover disabled:opacity-60"
              disabled={submitting}
            >
              {submitting ? '추천 계산 중…' : '추천 받기'}
            </button>
          )}
          <span className="sr-only" role="status" aria-live="polite">
            {submitting ? '추천을 계산하고 있습니다. 잠시만 기다려 주세요.' : ''}
          </span>
        </div>
      </div>
    </form>
  );
}
