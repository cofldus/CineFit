'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { MOTION_OPTIONS, ORIGIN_PRESETS, PRIORITY_OPTIONS } from '../src/data/constants';
import { readOnboardingState, type OnboardingAnswers } from '../src/lib/onboarding';
import type { MovieWithSpecs } from '../src/domain/recommendation/types';
import { formatSpecValue, keySpecEntries, SPEC_KEY_LABELS } from '../src/lib/display';
import { TrustBadge } from './TrustBadge';
import { SegmentedControl } from './SegmentedControl';
import { StepSection } from './StepSection';
import { RadioCard, ToggleCard } from './ToggleCard';

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

// 우선순위 라디오 카드용 글리프 — 균형(같은 높이 막대 3개)은 세 축을 고르게, 나머지는
// 화면(스크린)·이동/가격(핀+₩)을 각각 나타낸다.
function BalanceGlyph() {
  return (
    <span aria-hidden className="flex items-end gap-[4px] text-primary/80">
      {[0, 1, 2].map((i) => (
        <span key={i} className="w-[6px] rounded-[2px] bg-current" style={{ height: '16px' }} />
      ))}
    </span>
  );
}

function RouteGlyph() {
  return (
    <span aria-hidden className="flex items-center gap-1 text-primary/80">
      <PinGlyph />
      <WonGlyph />
    </span>
  );
}

// 커스텀 −/+ 스테퍼 버튼 — 네이티브 숫자 스피너는 스타일이 불가능해 숨기고 이것으로
// 조절한다(입력 필드에 직접 타이핑도 여전히 가능).
function StepBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-white/[0.04] text-text-sub transition-all hover:text-text active:scale-95"
    >
      {children}
    </button>
  );
}

const MinusGlyph = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" className="h-4 w-4">
    <path d="M3.5 8h9" />
  </svg>
);
const PlusGlyph = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" className="h-4 w-4">
    <path d="M3.5 8h9M8 3.5v9" />
  </svg>
);

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

const STEP_TITLES = ['언제, 어디서 볼까요?', '무엇을 가장 중요하게 보나요?', '피하고 싶은 조건이 있나요?'];

// 제출·실시간 카운트가 완전히 같은 쿼리를 쓰도록 한 곳에서만 조립한다.
function buildQuery(movieId: number, fd: FormData): URLSearchParams {
  return new URLSearchParams({
    movieId: String(movieId),
    date: String(fd.get('date')),
    originId: String(fd.get('originId')),
    maxTravelMinutes: String(fd.get('maxTravelMinutes')),
    maxPrice: String(fd.get('maxPrice')),
    priority: String(fd.get('priority')),
    allowImax: String(fd.get('allowImax') === 'on'),
    allowDolby: String(fd.get('allowDolby') === 'on'),
    allowStandard: String(fd.get('allowStandard') === 'on'),
    motionSickness: String(fd.get('motionSickness')),
    subtitleReadability: String(fd.get('subtitleReadability') === 'on'),
    neckComfort: String(fd.get('neckComfort') === 'on'),
    wheelchair: String(fd.get('wheelchair') === 'on'),
  });
}

// 선택한 영화 compact 요약 — 포스터 썸네일 + 제목 + 핵심 칩. 상세 사양은 펼침으로.
function MovieSummary({ movie }: { movie: MovieWithSpecs }) {
  const nativeAr = movie.specs.native_ar?.value;
  const chips: string[] = [];
  if (nativeAr) chips.push(`${Number(nativeAr).toFixed(2)}:1`);
  if (movie.specs.atmos_mix?.value === true) chips.push('Atmos');
  if (movie.specs.dolby_vision?.value === true) chips.push('Dolby Vision');
  const entries = keySpecEntries(movie);
  const verified = entries.filter((e) => e.spec.infoStatus === 'official' || e.spec.infoStatus === 'multi_source').length;
  const trust = entries.length === 0 ? '확인 중' : verified === entries.length ? '정보 확인됨' : '일부 추정';

  return (
    <section className="rounded-card-lg bg-surface-raised p-3.5" aria-label="선택한 영화">
      <div className="flex items-center gap-3.5">
        {movie.posterUrl ? (
          <Image src={movie.posterUrl} alt="" width={44} height={62} className="shrink-0 rounded-[6px] object-cover" />
        ) : (
          <div aria-hidden className="h-[62px] w-[44px] shrink-0 rounded-[6px] bg-surface-strong" />
        )}
        <div className="min-w-0 flex-1">
          <p className="m-0 truncate text-[15.5px] font-bold text-text">
            {movie.title}{' '}
            {movie.releaseYear ? <span className="font-normal text-text-sub">({movie.releaseYear})</span> : null}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {chips.map((c) => (
              <span key={c} className="rounded-full border border-border px-2 py-0.5 text-[11px] font-semibold tabular-nums text-text-sub">
                {c}
              </span>
            ))}
            <span className="text-[11.5px] text-text-tertiary">{trust}</span>
          </div>
        </div>
      </div>
      {entries.length > 0 ? (
        <details className="mt-2">
          <summary className="cursor-pointer text-[12px] font-medium text-text-tertiary hover:text-text-sub">
            사양·출처 자세히
          </summary>
          <ul className="m-0 mt-2 flex list-none flex-col gap-1.5 p-0">
            {entries.map(({ key, spec }) => (
              <li key={key} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px]">
                <span className="text-text-sub">{SPEC_KEY_LABELS[key]}</span>
                <strong className="font-semibold text-text">{formatSpecValue(key, spec)}</strong>
                <TrustBadge status={spec.infoStatus} observedAt={spec.observedAt} />
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}

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
export function RecommendForm({
  movieId,
  defaultDate,
  movie,
}: {
  movieId: number;
  defaultDate: string;
  movie: MovieWithSpecs;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(0);
  // 조건을 바꿀 때마다 "현재 조건에 맞는 후보 N개"를 실시간 조회(디바운스) — 결과 페이지와
  // 같은 파서·서비스의 preview 모드를 쓰므로 실제 결과 개수와 항상 일치한다.
  const [preview, setPreview] = useState<{ candidates: number; total: number } | null>(null);
  const [formTick, setFormTick] = useState(0);
  const [originVal, setOriginVal] = useState('cityhall');
  // 날짜는 퀵 칩(오늘/내일/모레) 선택 상태 표시를 위해 controlled — 값 자체는 여전히
  // name="date" 입력으로 폼 제출된다. 기준일은 서버가 준 defaultDate(앱 클럭의 오늘).
  const [dateVal, setDateVal] = useState(defaultDate);
  // 이동 시간·가격은 네이티브 스피너(스타일 불가) 대신 커스텀 −/+ 스테퍼로 조절한다.
  const [travelVal, setTravelVal] = useState(60);
  const [priceVal, setPriceVal] = useState(40000);
  const quickDates = useMemo(() => {
    const base = new Date(`${defaultDate}T12:00:00`);
    const pad = (n: number) => String(n).padStart(2, '0');
    return ['오늘', '내일', '모레'].map((label, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      return { label, value: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` };
    });
  }, [defaultDate]);
  // 온보딩 답변은 localStorage에만 있어 서버 렌더링 시점엔 알 수 없다 — 마운트 후 읽어와서
  // 적용한다. 이미 그려진 defaultValue/defaultChecked는 React가 재적용하지 않으므로, prefill이
  // 도착하면 key를 바꿔 해당 입력만 다시 마운트한다(초기 렌더와 하이드레이션은 항상 동일하게
  // 서버 기본값으로 그려지므로 하이드레이션 불일치는 생기지 않는다).
  const [prefill, setPrefill] = useState<OnboardingAnswers | null>(null);
  useEffect(() => {
    setPrefill(readOnboardingState()?.answers ?? null);
  }, []);
  const prefillKey = prefill ? 'prefilled' : 'initial';

  // 실시간 후보 수 — 400ms 디바운스, 폼 데이터 그대로 조회(제출과 같은 buildQuery).
  useEffect(() => {
    const t = setTimeout(async () => {
      const el = formRef.current;
      if (!el) return;
      try {
        const qs = buildQuery(movieId, new FormData(el));
        const r = await fetch(`/api/recommendations/preview-count?${qs.toString()}`);
        if (r.ok) {
          const j = (await r.json()) as { ok: boolean; candidates: number; total: number };
          if (j.ok) setPreview({ candidates: j.candidates, total: j.total });
        }
      } catch {
        /* 네트워크 실패 시 마지막 값 유지 — 카운트는 보조 정보라 조용히 넘어간다 */
      }
    }, 400);
    return () => clearTimeout(t);
  }, [movieId, formTick, dateVal, travelVal, priceVal, originVal, prefillKey]);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // 마지막 단계 전의 Enter/제출은 다음 단계로만 이동
    if (step < 2) {
      setStep((s) => s + 1);
      return;
    }
    setSubmitting(true);
    const qs = buildQuery(movieId, new FormData(e.currentTarget));
    router.push(`/results?${qs.toString()}`);
  }

  return (
    <form
      ref={formRef}
      onChange={() => setFormTick((t) => t + 1)}
      onSubmit={onSubmit}
      aria-label="추천 조건 입력"
      className="pb-4"
    >
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_290px] lg:items-start lg:gap-10">
      <div className="flex min-w-0 flex-col">
      {/* 모바일: 영화 요약을 폼 위에 compact로. 데스크톱은 우측 요약 패널이 담당. */}
      <div className="mb-5 lg:hidden">
        <MovieSummary movie={movie} />
      </div>

      {/* 진행 표시 — 완료 단계는 체크, 현재는 와인 채움, 연결선도 완료 구간은 로즈. */}
      <ol className="m-0 mb-6 flex list-none items-center gap-2 p-0" aria-label="입력 단계">
        {STEP_TITLES.map((t, i) => (
          <li key={t} className="flex min-w-0 items-center gap-2">
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                i === step ? 'bg-primary-strong text-white' : i < step ? 'bg-primary-soft text-primary' : 'bg-surface-strong text-text-tertiary'
              }`}
              aria-current={i === step ? 'step' : undefined}
            >
              {i < step ? (
                <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3" aria-hidden>
                  <path d="M3 8.2l3.2 3.2L13 4.6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                i + 1
              )}
            </span>
            <span className={`hidden truncate text-[13px] sm:block ${i === step ? 'font-semibold text-text' : 'text-text-tertiary'}`}>
              {t}
            </span>
            {i < STEP_TITLES.length - 1 ? (
              <span aria-hidden className={`h-px w-4 shrink-0 transition-colors sm:w-6 ${i < step ? 'bg-primary/50' : 'bg-border'}`} />
            ) : null}
          </li>
        ))}
      </ol>

      <div className={step === 0 ? 'stage-enter' : 'hidden'}>
      <StepSection step={1} title="언제, 어디서 볼까요?" first numbered={false}>
        <div className="flex flex-col gap-2.5">
          {/* 날짜 — 대부분의 선택은 오늘/내일/모레 퀵 칩으로 끝나고, 다른 날짜만 입력 필드를
              쓴다(네이티브 달력 팝업 의존 최소화). */}
          <div className="rounded-card bg-surface-raised p-3.5 transition-shadow focus-within:shadow-[inset_0_0_0_1px_rgba(188,96,118,0.5)]">
            <div className="flex items-center gap-3">
              <FieldIcon>
                <CalendarGlyph />
              </FieldIcon>
              <label className="min-w-0 flex-1">
                <span className={fieldLabelCls}>관람 날짜</span>
                <input
                  className={`${fieldInputCls} mt-0.5`}
                  type="date"
                  name="date"
                  value={dateVal}
                  onChange={(e) => setDateVal(e.target.value)}
                  required
                />
              </label>
            </div>
            <div className="mt-2.5 flex gap-1.5 pl-12" role="group" aria-label="빠른 날짜 선택">
              {quickDates.map((q) => (
                <button
                  key={q.value}
                  type="button"
                  aria-pressed={dateVal === q.value}
                  onClick={() => setDateVal(q.value)}
                  className={`min-h-8 rounded-full px-3.5 text-[12.5px] font-semibold transition-colors ${
                    dateVal === q.value ? 'bg-primary-strong text-white' : 'bg-white/[0.04] text-text-sub hover:text-text'
                  }`}
                >
                  {q.label}
                </button>
              ))}
            </div>
          </div>

          {/* 출발 위치 — 네이티브 드롭다운(스타일 불가한 흰 팝업) 대신 커스텀 위치 칩 그리드.
              같은 name의 radio 그룹이라 폼 데이터는 select와 동일하게 하나의 originId. */}
          <div className="rounded-card bg-surface-raised p-3.5">
            <div className="flex items-center gap-3">
              <FieldIcon>
                <PinGlyph />
              </FieldIcon>
              <span className={fieldLabelCls}>출발 위치</span>
            </div>
            <div className="mt-2.5 grid grid-cols-2 gap-1.5 pl-12 sm:grid-cols-3 sm:pl-12" role="radiogroup" aria-label="출발 위치">
              {ORIGIN_PRESETS.map((o) => (
                <label
                  key={o.id}
                  className="flex min-h-10 cursor-pointer items-center justify-center rounded-[10px] bg-white/[0.04] px-2 text-center text-[13px] font-medium text-text-sub transition-colors hover:text-text has-[:checked]:bg-primary-strong has-[:checked]:font-semibold has-[:checked]:text-white has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary"
                >
                  <input
                    type="radio"
                    name="originId"
                    value={o.id}
                    checked={originVal === o.id}
                    onChange={() => setOriginVal(o.id)}
                    className="sr-only"
                  />
                  {o.label.replace(' 인근', '')}
                </label>
              ))}
            </div>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2">
            <div className={fieldCls}>
              <FieldIcon>
                <ClockGlyph />
              </FieldIcon>
              <label className="min-w-0 flex-1">
                <span className={fieldLabelCls}>최대 이동 시간</span>
                <span className="mt-0.5 flex items-baseline gap-1">
                  <input
                    className={`${fieldInputCls} w-14 [appearance:textfield] [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden`}
                    type="number"
                    name="maxTravelMinutes"
                    value={travelVal}
                    onChange={(e) => setTravelVal(Number(e.target.value) || 0)}
                    onBlur={() => setTravelVal((v) => clamp(v, 5, 240))}
                    min={5}
                    max={240}
                    step={5}
                  />
                  <span className="text-[13px] text-text-sub">분</span>
                </span>
              </label>
              <div className="flex gap-1">
                <StepBtn label="이동 시간 5분 줄이기" onClick={() => setTravelVal((v) => clamp(v - 5, 5, 240))}>
                  <MinusGlyph />
                </StepBtn>
                <StepBtn label="이동 시간 5분 늘리기" onClick={() => setTravelVal((v) => clamp(v + 5, 5, 240))}>
                  <PlusGlyph />
                </StepBtn>
              </div>
            </div>
            <div className={fieldCls}>
              <FieldIcon>
                <WonGlyph />
              </FieldIcon>
              <label className="min-w-0 flex-1">
                <span className={fieldLabelCls}>최대 가격</span>
                <span className="mt-0.5 flex items-baseline gap-1">
                  <input
                    className={`${fieldInputCls} w-20 [appearance:textfield] [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden`}
                    type="number"
                    name="maxPrice"
                    value={priceVal}
                    onChange={(e) => setPriceVal(Number(e.target.value) || 0)}
                    onBlur={() => setPriceVal((v) => clamp(v, 1000, 200000))}
                    min={1000}
                    max={200000}
                    step={1000}
                  />
                  <span className="text-[13px] text-text-sub">원</span>
                </span>
              </label>
              <div className="flex gap-1">
                <StepBtn label="가격 5천 원 줄이기" onClick={() => setPriceVal((v) => clamp(v - 5000, 1000, 200000))}>
                  <MinusGlyph />
                </StepBtn>
                <StepBtn label="가격 5천 원 늘리기" onClick={() => setPriceVal((v) => clamp(v + 5000, 1000, 200000))}>
                  <PlusGlyph />
                </StepBtn>
              </div>
            </div>
          </div>
        </div>
      </StepSection>
      </div>

      <div className={step === 1 ? 'stage-enter' : 'hidden'}>
      <StepSection step={2} title="무엇을 가장 중요하게 보나요?" first numbered={false}>
        <fieldset className="m-0 border-0 p-0" key={prefillKey}>
          <legend className="mb-2 block text-sm font-semibold text-text">가장 중요한 것</legend>
          <div className="grid gap-2.5 sm:[grid-template-columns:repeat(auto-fit,minmax(230px,1fr))]" role="radiogroup" aria-label="가장 중요한 것">
            <RadioCard
              name="priority"
              value="balance"
              defaultChecked={(prefill?.priority ?? 'balance') === 'balance'}
              title="균형 있게"
              description="화면·이동·가격을 고르게 반영"
              visual={<BalanceGlyph />}
            />
            <RadioCard
              name="priority"
              value="quality"
              defaultChecked={prefill?.priority === 'quality'}
              title="영상·음향 품질"
              description="화면과 사운드 가중치를 높여요"
              visual={<ScreenGlyph ratio={2.2} wave />}
            />
            <RadioCard
              name="priority"
              value="logistics"
              defaultChecked={prefill?.priority === 'logistics'}
              title="가까운 곳·가성비"
              description="이동시간·가격 가중치를 높여요"
              visual={<RouteGlyph />}
            />
          </div>
        </fieldset>
        <fieldset className="m-0 border-0 p-0">
          <legend className="mb-2 block text-sm font-semibold text-text">허용할 상영 방식</legend>
          <div className="grid gap-2.5 sm:[grid-template-columns:repeat(auto-fit,minmax(230px,1fr))]">
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
      <StepSection step={3} title="피하고 싶은 조건이 있나요?" first numbered={false}>
        <SegmentedControl
          key={prefillKey}
          name="motionSickness"
          legend="4DX 멀미, 얼마나 신경 쓰이세요?"
          options={MOTION_OPTIONS.map((o, i) => ({ ...o, intensity: i }))}
          defaultValue={prefill?.motionSickness ?? '0'}
        />
        <fieldset className="m-0 border-0 p-0">
          <legend className="mb-2 block text-sm font-semibold text-text">좌석·편의 선호</legend>
          <div className="grid gap-2.5 sm:[grid-template-columns:repeat(auto-fit,minmax(230px,1fr))]">
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
      </div>

      {/* 데스크톱 요약 패널 — 선택한 영화 + 현재 조건 + 실시간 후보 수. 조건을 조절할수록
          결과가 좁혀지는 것이 바로 보인다. */}
      <aside className="hidden lg:block" aria-label="현재 조건 요약">
        <div className="sticky top-24 flex flex-col gap-4">
          <MovieSummary movie={movie} />
          <div className="rounded-card-lg bg-surface-raised p-4">
            <p className="m-0 text-[12px] font-semibold uppercase tracking-wide text-text-sub">현재 조건</p>
            <dl className="m-0 mt-2.5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[13.5px]">
              <dt className="text-text-tertiary">날짜</dt>
              <dd className="m-0 text-right font-medium tabular-nums text-text">{dateVal}</dd>
              <dt className="text-text-tertiary">출발</dt>
              <dd className="m-0 text-right font-medium text-text">
                {ORIGIN_PRESETS.find((o) => o.id === originVal)?.label.replace(' 인근', '') ?? '-'}
              </dd>
              <dt className="text-text-tertiary">이동</dt>
              <dd className="m-0 text-right font-medium tabular-nums text-text">{travelVal}분 이내</dd>
              <dt className="text-text-tertiary">예산</dt>
              <dd className="m-0 text-right font-medium tabular-nums text-text">{priceVal.toLocaleString('ko-KR')}원</dd>
            </dl>
            <div className="mt-3.5 border-t border-border pt-3.5" role="status" aria-live="polite">
              {preview ? (
                <>
                  <p className="m-0 text-[14px] font-bold text-text">
                    조건에 맞는 후보 <span className="text-primary">{preview.candidates}개</span>
                  </p>
                  <p className="m-0 mt-0.5 text-[12px] tabular-nums text-text-tertiary">전체 {preview.total}개 회차 중</p>
                </>
              ) : (
                <p className="m-0 text-[13px] text-text-tertiary">후보 계산 중…</p>
              )}
            </div>
          </div>
        </div>
      </aside>
      </div>

      <div
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur-md"
        style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
      >
        {preview ? (
          <p className="m-0 mb-2 text-center text-[12px] text-text-sub lg:hidden" role="status">
            현재 조건에 맞는 후보 <strong className="font-bold text-primary">{preview.candidates}개</strong>
          </p>
        ) : null}
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
            // key를 분리해 React가 '다음'과 '추천 받기'를 같은 DOM 노드로 재사용하지 못하게
            // 한다 — 재사용되면 클릭 처리 도중 type이 submit으로 바뀌어, 마지막 '다음' 클릭의
            // 기본 동작이 폼 제출로 이어지는 버그가 있었다(단계 이동과 제출이 동시에 발생).
            <button
              key="next"
              type="button"
              onClick={() => setStep((s) => s + 1)}
              className="flex min-h-12 flex-1 items-center justify-center rounded-card bg-primary-strong text-base font-semibold text-white transition-colors hover:bg-primary-strong-hover"
            >
              다음
            </button>
          ) : (
            <button
              key="submit"
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
