'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ORIGIN_PRESETS,
  PREMIUM_ALLOWANCE_OPTIONS,
  PRIORITY_SECONDARY_OPTIONS,
  TIME_WINDOW_OPTIONS,
  TRAVEL_LIMIT_OPTIONS,
} from '../src/data/constants';
import { WEIGHT_PRESETS } from '../src/domain/recommendation/presets';
import { readOnboardingState, type OnboardingAnswers } from '../src/lib/onboarding';
import type { MovieWithSpecs, Priority, TimeWindow } from '../src/domain/recommendation/types';
import { formatSpecValue, keySpecEntries, SPEC_KEY_LABELS } from '../src/lib/display';
import { TrustBadge } from './TrustBadge';
import { StepSection } from './StepSection';
import { RadioCard } from './ToggleCard';

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

// 우선순위 카드용 글리프(R19 복원) — 화면(스크린)·좌석(그리드)·이동(핀)·가격(₩)·균형(막대).
function WonGlyph() {
  return (
    <svg {...glyphProps} className="h-[18px] w-[18px]">
      <path d="M3 6.5l2.4 7 2.3-7 2.3 7 2.3-7 2.3 7 2.4-7" />
      <path d="M2.5 10.5h15" />
    </svg>
  );
}

function BalanceGlyph() {
  return (
    <span aria-hidden className="flex items-end gap-[4px] text-primary/80">
      {[0, 1, 2].map((i) => (
        <span key={i} className="w-[6px] rounded-[2px] bg-current" style={{ height: '16px' }} />
      ))}
    </span>
  );
}

// 편도 이동 한도용 동심원 글리프 — 우측 패널의 반경 그래픽과 같은 언어.
function RouteRadiusGlyph() {
  return (
    <svg {...glyphProps} className="h-[18px] w-[18px]">
      <circle cx="10" cy="10" r="7.5" opacity="0.45" />
      <circle cx="10" cy="10" r="4" opacity="0.75" />
      <circle cx="10" cy="10" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

const STEP_TITLES = ['언제, 어디서 볼까요?', '이번 관람에서 무엇이 가장 중요한가요?', '피하고 싶은 조건이 있나요?'];
// 모바일 compact progress("1 / 3 · 위치와 시간")와 단계별 CTA 문구(R15 §5, R19 문구).
const STEP_SHORT = ['위치와 시간', '우선순위', '피하고 싶은 조건'] as const;
const NEXT_LABELS = ['관람 우선순위 정하기 →', '피하고 싶은 조건 →'] as const;

// 우선순위 선택이 엔진 가중치를 실제로 어떻게 바꾸는지 — WEIGHT_PRESETS(실제 엔진 값)를
// 사용자용 3그룹으로 합산해 보여준다(새 숫자를 만들지 않음). 화면·음향 = 포맷 매칭 W1 +
// 상영관 품질 W2, 좌석·시간대 = 시간대 W3 + 좌석 W4, 이동·가격 = W7 + W8.
function weightGroups(priority: Priority): { label: string; value: number }[] {
  const w = WEIGHT_PRESETS[priority];
  return [
    { label: '화면·음향', value: w.W1 + w.W2 },
    { label: '좌석·시간대', value: w.W3 + w.W4 },
    { label: '이동·가격', value: w.W7 + w.W8 },
  ];
}

// 회피 조건(step 3)의 compact toggle row — R19: 부모가 상태를 소유하는 controlled 체크
// ("해당 없음" 상호 배타 처리를 위해). name이 없으면 폼 데이터로 제출되지 않는 표시 전용.
function ToggleRow({
  name,
  title,
  effect,
  checked,
  onChange,
  visual,
}: {
  name?: string;
  title: string;
  effect: string;
  checked: boolean;
  onChange: (on: boolean) => void;
  visual?: React.ReactNode;
}) {
  return (
    <label className="group flex min-h-[52px] cursor-pointer items-center gap-3 rounded-card bg-surface-raised px-3.5 py-2.5 transition-colors has-[:checked]:bg-primary-soft has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary">
      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
      {visual ? (
        <span aria-hidden className="flex h-8 w-11 shrink-0 items-center justify-center opacity-70 group-has-[:checked]:opacity-100">
          {visual}
        </span>
      ) : null}
      <span className="min-w-0 flex-1">
        <span className="block text-[14.5px] font-semibold text-text">{title}</span>
        <span className="block text-[13px] leading-snug text-text-sub">{effect}</span>
      </span>
      <span
        aria-hidden
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border-strong text-transparent transition-colors group-has-[:checked]:border-primary-strong group-has-[:checked]:bg-primary-strong group-has-[:checked]:text-white"
      >
        <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3">
          <path d="M3 8.2l3.2 3.2L13 4.6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </label>
  );
}

// 제출·실시간 카운트가 완전히 같은 쿼리를 쓰도록 한 곳에서만 조립한다(R19 파라미터 체계).
// 절대 예산(maxPrice)은 더 이상 보내지 않는다 — 서버가 추가 지불 의향으로 상한을 파생한다.
function buildQuery(movieId: number, fd: FormData): URLSearchParams {
  const timeWindow = String(fd.get('timeWindow') ?? 'any');
  const originId = String(fd.get('originId') ?? 'cityhall');
  const p = new URLSearchParams({
    movieId: String(movieId),
    date: String(fd.get('date')),
    timeWindow,
    originId,
    maxTravelMinutes: String(fd.get('maxTravelMinutes')),
    premiumAllowance: String(fd.get('premiumAllowance') ?? 'experience_first'),
    priority: String(fd.get('priority') ?? 'balance'),
    prioritySecondary: String(fd.get('prioritySecondary') ?? 'none'),
    motionSickness: String(fd.get('motionSickness') ?? '0'),
    avoidFront: String(fd.get('avoidFront') === 'on'),
    bigScreenSensitive: String(fd.get('bigScreenSensitive') === 'on'),
    subtitleReadability: String(fd.get('subtitleReadability') === 'on'),
    neckComfort: String(fd.get('neckComfort') === 'on'),
    wheelchair: String(fd.get('wheelchair') === 'on'),
  });
  if (timeWindow === 'custom') {
    p.set('timeFrom', String(fd.get('timeFrom') ?? ''));
    p.set('timeTo', String(fd.get('timeTo') ?? ''));
  }
  if (originId === 'custom') {
    p.set('originLat', String(fd.get('originLat') ?? ''));
    p.set('originLng', String(fd.get('originLng') ?? ''));
    p.set('originLabel', String(fd.get('originLabel') ?? '현재 위치'));
  }
  return p;
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
  type Preview = {
    candidates: number;
    total: number;
    funnel?: { total: number; afterTravel: number; afterPrice: number; final: number };
  };
  const [preview, setPreview] = useState<Preview | null>(null);
  // 직전 후보 수 — 조건이 바뀌어 개수가 달라졌을 때 "7개 → 4개"로 변화를 보여준다(§8).
  const [prevCount, setPrevCount] = useState<number | null>(null);
  const previewRef = useRef<Preview | null>(null);
  const [formTick, setFormTick] = useState(0);
  const [originVal, setOriginVal] = useState('cityhall');
  const [priorityVal, setPriorityVal] = useState<Priority>('balance');
  const [secondaryVal, setSecondaryVal] = useState('none');
  // 날짜·시간대는 퀵 칩 선택 상태 표시를 위해 controlled — 값 자체는 name 입력으로 제출된다.
  const [dateVal, setDateVal] = useState(defaultDate);
  const [timeWindowVal, setTimeWindowVal] = useState<TimeWindow>('any');
  const [timeFromVal, setTimeFromVal] = useState('18:00');
  const [timeToVal, setTimeToVal] = useState('21:00');
  // 편도 이동 한도 — preset 칩이 기본, 직접 입력은 보조(R19).
  const [travelVal, setTravelVal] = useState(60);
  // 현재 위치(geolocation) — 정확한 주소를 강제하지 않고 좌표만 쓴다.
  const [customOrigin, setCustomOrigin] = useState<{ lat: number; lng: number } | null>(null);
  const [geoBusy, setGeoBusy] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [recentOrigins, setRecentOrigins] = useState<string[]>([]);
  // 회피 조건(step 3) — "해당 없음" 상호 배타를 위해 부모가 상태를 소유한다.
  const [avoid, setAvoid] = useState({
    front: false,
    bigScreen: false,
    neck: false,
    subtitle: false,
    vibration: false,
    wheelchair: false,
  });
  const noneAvoided = !Object.values(avoid).some(Boolean);
  const setAvoidFlag = (key: keyof typeof avoid, on: boolean) => setAvoid((a) => ({ ...a, [key]: on }));
  const clearAvoid = () =>
    setAvoid({ front: false, bigScreen: false, neck: false, subtitle: false, vibration: false, wheelchair: false });

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setGeoError('이 브라우저에서는 위치를 쓸 수 없어요 — 아래에서 장소를 선택해 주세요.');
      return;
    }
    setGeoBusy(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCustomOrigin({ lat: Number(pos.coords.latitude.toFixed(5)), lng: Number(pos.coords.longitude.toFixed(5)) });
        setOriginVal('custom');
        setGeoBusy(false);
      },
      () => {
        setGeoError('위치 권한이 없어요 — 아래에서 가까운 장소를 선택해 주세요.');
        setGeoBusy(false);
      },
      { maximumAge: 60_000, timeout: 8_000 },
    );
  }

  const quickDates = useMemo(() => {
    const base = new Date(`${defaultDate}T12:00:00`);
    const pad = (n: number) => String(n).padStart(2, '0');
    const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const tomorrow = new Date(base);
    tomorrow.setDate(base.getDate() + 1);
    // 이번 주말 = 다가오는 토요일(오늘이 주말이면 오늘).
    const weekend = new Date(base);
    const day = weekend.getDay();
    if (day !== 6 && day !== 0) weekend.setDate(weekend.getDate() + ((6 - day + 7) % 7));
    return [
      { label: '오늘', value: fmt(base) },
      { label: '내일', value: fmt(tomorrow) },
      { label: '이번 주말', value: fmt(weekend) },
    ];
  }, [defaultDate]);
  // 온보딩 답변은 localStorage에만 있어 서버 렌더링 시점엔 알 수 없다 — 마운트 후 읽어와서
  // 적용한다. 최근 출발 위치도 같은 시점에 읽는다.
  const [prefill, setPrefill] = useState<OnboardingAnswers | null>(null);
  useEffect(() => {
    const answers = readOnboardingState()?.answers ?? null;
    setPrefill(answers);
    if (answers?.priority) {
      // 구 온보딩 값 'logistics'는 R19 5축에서 distance로 흡수한다.
      setPriorityVal(answers.priority === 'logistics' ? 'distance' : (answers.priority as Priority));
    }
    if (answers?.subtitleReadability) setAvoid((a) => ({ ...a, subtitle: true }));
    try {
      const stored = JSON.parse(localStorage.getItem('cinefit.recent-origins') ?? '[]') as string[];
      setRecentOrigins(stored.filter((id) => ORIGIN_PRESETS.some((o) => o.id === id)).slice(0, 2));
    } catch {
      /* 저장값 손상 시 무시 */
    }
  }, []);
  const prefillKey = prefill ? 'prefilled' : 'initial';

  // 입력 조건을 사람이 읽는 문장으로 실시간 요약(R19) — 모바일 top sheet와 우측 패널 공용.
  const summaryLines = useMemo(() => {
    const dateLabel = quickDates.find((q) => q.value === dateVal)?.label ?? dateVal;
    const tw =
      timeWindowVal === 'custom'
        ? `${timeFromVal}–${timeToVal} 시작`
        : (TIME_WINDOW_OPTIONS.find((o) => o.value === timeWindowVal)?.label ?? '시간 상관없음');
    const originLabel =
      originVal === 'custom'
        ? '현재 위치'
        : (ORIGIN_PRESETS.find((o) => o.id === originVal)?.label.replace(' 인근', '') ?? '-');
    const travelLabel = travelVal >= 240 ? '거리 상관없음' : `편도 ${travelVal}분 이내`;
    return [`${dateLabel} · ${tw}`, `${originLabel} 출발`, travelLabel];
  }, [quickDates, dateVal, timeWindowVal, timeFromVal, timeToVal, originVal, travelVal]);

  // 실시간 후보 수 — 400ms 디바운스, 폼 데이터 그대로 조회(제출과 같은 buildQuery).
  useEffect(() => {
    const t = setTimeout(async () => {
      const el = formRef.current;
      if (!el) return;
      try {
        const qs = buildQuery(movieId, new FormData(el));
        const r = await fetch(`/api/recommendations/preview-count?${qs.toString()}`);
        if (r.ok) {
          const j = (await r.json()) as { ok: boolean } & Preview;
          if (j.ok) {
            const prev = previewRef.current;
            setPrevCount(prev && prev.candidates !== j.candidates ? prev.candidates : null);
            previewRef.current = { candidates: j.candidates, total: j.total, funnel: j.funnel };
            setPreview(previewRef.current);
          }
        }
      } catch {
        /* 네트워크 실패 시 마지막 값 유지 — 카운트는 보조 정보라 조용히 넘어간다 */
      }
    }, 400);
    return () => clearTimeout(t);
  }, [movieId, formTick, dateVal, travelVal, originVal, timeWindowVal, timeFromVal, timeToVal, priorityVal, secondaryVal, avoid, prefillKey]);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // 마지막 단계 전의 Enter/제출은 다음 단계로만 이동
    if (step < 2) {
      setStep((s) => s + 1);
      return;
    }
    setSubmitting(true);
    // 최근 출발 위치 저장(프리셋만) — 다음 방문의 "최근:" 칩.
    if (originVal !== 'custom') {
      try {
        const next = [originVal, ...recentOrigins.filter((r) => r !== originVal)].slice(0, 2);
        localStorage.setItem('cinefit.recent-origins', JSON.stringify(next));
      } catch {
        /* 저장 실패는 무시 */
      }
    }
    const qs = buildQuery(movieId, new FormData(e.currentTarget));
    router.push(`/results?${qs.toString()}`);
  }

  return (
    <form
      ref={formRef}
      onChange={() => setFormTick((t) => t + 1)}
      onSubmit={onSubmit}
      aria-label="추천 조건 입력"
      className="pb-36 lg:pb-4"
    >
      {/* R14 §8: 데스크톱 65/35 작업 공간 — 좌측 입력, 우측 라이브 조건 패널. */}
      <div className="lg:grid lg:grid-cols-[minmax(0,13fr)_minmax(0,7fr)] lg:items-start lg:gap-10">
      <div className="flex min-w-0 flex-col">
      {/* 모바일: 접을 수 있는 top sheet 요약 — 영화 + 현재 조건. 데스크톱은 우측 패널 담당. */}
      <details className="mb-5 rounded-card-lg bg-surface-raised lg:hidden">
        <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-3 px-3.5 text-[13.5px] font-semibold text-text">
          <span className="truncate">{movie.title} · 현재 조건 요약</span>
          <span aria-hidden className="text-text-tertiary">▾</span>
        </summary>
        <div className="border-t border-border px-3.5 pb-3.5 pt-3">
          <MovieSummary movie={movie} />
          <p className="m-0 mt-3 flex flex-col gap-0.5 text-[13.5px] font-medium tabular-nums text-text">
            {summaryLines.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </p>
        </div>
      </details>

      {/* 모바일: 점 대신 "1 / 3 · 위치와 시간" compact progress(R15 §5). */}
      <p className="m-0 mb-4 text-[13.5px] font-semibold tabular-nums text-text sm:hidden" aria-label="입력 단계">
        {step + 1} <span className="text-text-tertiary">/ 3</span> · {STEP_SHORT[step]}
      </p>
      {/* 데스크톱 진행 표시 — 완료 단계는 체크, 현재는 와인 채움, 연결선도 완료 구간은 로즈. */}
      <ol className="m-0 mb-6 hidden list-none items-center gap-2 p-0 sm:flex" aria-label="입력 단계">
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
          {/* 1) 관람 날짜 — 오늘/내일/이번 주말 shortcut이 기본, 다른 날짜만 달력 입력. */}
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
            <div className="mt-2.5 flex flex-wrap gap-1.5 pl-12" role="group" aria-label="빠른 날짜 선택">
              {quickDates.map((q) => (
                <button
                  key={q.label}
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

          {/* 2) 희망 상영 시작 시간 — 반드시 "상영 시작 시각" 기준임을 안내(R19). */}
          <div className="rounded-card bg-surface-raised p-3.5">
            <div className="flex items-center gap-3">
              <FieldIcon>
                <ClockGlyph />
              </FieldIcon>
              <span className={fieldLabelCls}>
                희망 상영 시작 시간 <span className="font-normal normal-case text-text-tertiary">· 상영 시작 시각 기준</span>
              </span>
            </div>
            <div className="mt-2.5 flex flex-wrap gap-1.5 pl-12" role="radiogroup" aria-label="희망 상영 시작 시간">
              {TIME_WINDOW_OPTIONS.map((o) => (
                <label
                  key={o.value}
                  className={`flex min-h-8 cursor-pointer items-center rounded-full px-3.5 text-[12.5px] font-semibold transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary ${
                    timeWindowVal === o.value ? 'bg-primary-strong text-white' : 'bg-white/[0.04] text-text-sub hover:text-text'
                  }`}
                >
                  <input
                    type="radio"
                    name="timeWindow"
                    value={o.value}
                    checked={timeWindowVal === o.value}
                    onChange={() => setTimeWindowVal(o.value)}
                    className="sr-only"
                  />
                  {o.label}
                  {'hint' in o && o.hint ? <span className="ml-1 text-[10.5px] opacity-75">{o.hint}</span> : null}
                </label>
              ))}
              <label
                className={`flex min-h-8 cursor-pointer items-center rounded-full px-3.5 text-[12.5px] font-semibold transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary ${
                  timeWindowVal === 'custom' ? 'bg-primary-strong text-white' : 'bg-white/[0.04] text-text-sub hover:text-text'
                }`}
              >
                <input
                  type="radio"
                  name="timeWindow"
                  value="custom"
                  checked={timeWindowVal === 'custom'}
                  onChange={() => setTimeWindowVal('custom')}
                  className="sr-only"
                />
                직접 설정
              </label>
            </div>
            {timeWindowVal === 'custom' ? (
              <div className="mt-2.5 flex flex-wrap items-center gap-2 pl-12 text-[13px] text-text-sub">
                <input
                  type="time"
                  name="timeFrom"
                  value={timeFromVal}
                  onChange={(e) => setTimeFromVal(e.target.value)}
                  aria-label="시작 범위 시작"
                  className="min-h-9 rounded-[8px] border border-border bg-bg px-2 text-[14px] text-text [color-scheme:dark]"
                  required
                />
                부터
                <input
                  type="time"
                  name="timeTo"
                  value={timeToVal}
                  onChange={(e) => setTimeToVal(e.target.value)}
                  aria-label="시작 범위 끝"
                  className="min-h-9 rounded-[8px] border border-border bg-bg px-2 text-[14px] text-text [color-scheme:dark]"
                  required
                />
                사이에 시작
              </div>
            ) : null}
          </div>

          {/* 3) 출발 위치 — 현재 위치 / 장소 프리셋 / 최근 위치. 정확한 주소를 강제하지 않는다. */}
          <div className="rounded-card bg-surface-raised p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <FieldIcon>
                  <PinGlyph />
                </FieldIcon>
                <span className={fieldLabelCls}>출발 위치</span>
              </div>
              <button
                type="button"
                onClick={useCurrentLocation}
                disabled={geoBusy}
                className="min-h-8 rounded-full border border-border px-3 text-[12px] font-semibold text-text-sub transition-colors hover:border-border-strong hover:text-text disabled:opacity-50"
              >
                {geoBusy ? '위치 확인 중…' : '현재 위치 사용'}
              </button>
            </div>
            {originVal === 'custom' && customOrigin ? (
              <p className="m-0 mt-2 pl-12 text-[13px] font-medium text-primary">
                현재 위치 기준으로 찾을게요
                <button
                  type="button"
                  onClick={() => setOriginVal('cityhall')}
                  className="ml-2 text-[12px] font-normal text-text-tertiary underline underline-offset-2"
                >
                  지우기
                </button>
              </p>
            ) : null}
            {geoError ? <p className="m-0 mt-2 pl-12 text-[12.5px] text-trust-low">{geoError}</p> : null}
            <div className="mt-2.5 grid grid-cols-2 gap-1.5 pl-12 sm:grid-cols-3" role="radiogroup" aria-label="출발 위치">
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
            {recentOrigins.length > 0 ? (
              <div className="mt-2 flex flex-wrap items-center gap-1.5 pl-12">
                <span className="text-[11px] text-text-tertiary">최근:</span>
                {recentOrigins.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setOriginVal(r)}
                    className="min-h-7 rounded-full bg-white/[0.04] px-2.5 text-[11.5px] text-text-sub transition-colors hover:text-text"
                  >
                    {ORIGIN_PRESETS.find((o) => o.id === r)?.label.replace(' 인근', '') ?? r}
                  </button>
                ))}
              </div>
            ) : null}
            {originVal === 'custom' && customOrigin ? (
              <>
                <input type="hidden" name="originId" value="custom" />
                <input type="hidden" name="originLat" value={customOrigin.lat} />
                <input type="hidden" name="originLng" value={customOrigin.lng} />
                <input type="hidden" name="originLabel" value="현재 위치" />
              </>
            ) : null}
          </div>

          {/* 4) 극장까지 "편도" 이동 한도 — preset 칩이 기본, 직접 입력은 보조(R19). */}
          <div className="rounded-card bg-surface-raised p-3.5">
            <div className="flex items-center gap-3">
              <FieldIcon>
                <RouteRadiusGlyph />
              </FieldIcon>
              <span className={fieldLabelCls}>극장까지 편도 이동 한도</span>
            </div>
            <div className="mt-2.5 flex flex-wrap gap-1.5 pl-12" role="radiogroup" aria-label="편도 이동 한도">
              {TRAVEL_LIMIT_OPTIONS.map((o) => (
                <label
                  key={o.value}
                  className={`flex min-h-8 cursor-pointer items-center rounded-full px-3.5 text-[12.5px] font-semibold transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary ${
                    travelVal === o.value ? 'bg-primary-strong text-white' : 'bg-white/[0.04] text-text-sub hover:text-text'
                  }`}
                >
                  <input
                    type="radio"
                    name="travelPreset"
                    value={o.value}
                    checked={travelVal === o.value}
                    onChange={() => setTravelVal(o.value)}
                    className="sr-only"
                  />
                  {o.label}
                </label>
              ))}
            </div>
            <details className="mt-2 pl-12">
              <summary className="cursor-pointer text-[12px] text-text-tertiary hover:text-text-sub">
                분 단위로 직접 입력
              </summary>
              <span className="mt-1.5 flex items-baseline gap-1.5">
                <input
                  className="min-h-9 w-16 rounded-[8px] border border-border bg-bg px-2 text-[14px] tabular-nums text-text [appearance:textfield] [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden"
                  type="number"
                  value={travelVal}
                  onChange={(e) => setTravelVal(clamp(Number(e.target.value) || 0, 5, 240))}
                  min={5}
                  max={240}
                  step={5}
                  aria-label="편도 이동 한도(분)"
                />
                <span className="text-[13px] text-text-sub">분</span>
              </span>
            </details>
            <input type="hidden" name="maxTravelMinutes" value={travelVal} />
          </div>
        </div>
      </StepSection>
      </div>

      <div className={step === 1 ? 'stage-enter' : 'hidden'}>
      <StepSection step={2} title="이번 관람에서 무엇이 가장 중요한가요?" first numbered={false}>
        <fieldset className="m-0 border-0 p-0" key={prefillKey}>
          <legend className="mb-2 block text-sm font-semibold text-text">가장 중요한 기준</legend>
          {/* 시그니처 비주얼 카드(R19 복원) — 옵션의 의미를 미니 일러스트로 보여주는
              RadioCard 그리드. 5축 질문 구조는 그대로, 시각 언어만 카드로. */}
          <div
            className="grid gap-2.5 sm:[grid-template-columns:repeat(auto-fit,minmax(210px,1fr))]"
            role="radiogroup"
            aria-label="가장 중요한 기준"
          >
            <RadioCard
              name="priority"
              value="quality"
              checked={priorityVal === 'quality'}
              onChange={() => setPriorityVal('quality')}
              title="가장 좋은 화면과 사운드"
              description="화면·사운드 가중치를 최상위로"
              visual={<ScreenGlyph ratio={2.2} wave />}
            />
            <RadioCard
              name="priority"
              value="seat"
              checked={priorityVal === 'seat'}
              onChange={() => setPriorityVal('seat')}
              title="편안하고 보기 좋은 좌석"
              description="좌석 적합 가중치를 최상위로"
              visual={<SeatGlyph lit={(r, c) => r >= 1 && r <= 2 && c >= 2 && c <= 4} />}
            />
            <RadioCard
              name="priority"
              value="distance"
              checked={priorityVal === 'distance'}
              onChange={() => setPriorityVal('distance')}
              title="가까운 영화관"
              description="이동 시간 가중치를 최상위로"
              visual={
                <span aria-hidden className="text-primary/80">
                  <PinGlyph />
                </span>
              }
            />
            <RadioCard
              name="priority"
              value="price"
              checked={priorityVal === 'price'}
              onChange={() => setPriorityVal('price')}
              title="합리적인 가격"
              description="가격 가중치를 최상위로"
              visual={
                <span aria-hidden className="text-primary/80">
                  <WonGlyph />
                </span>
              }
            />
            <RadioCard
              name="priority"
              value="balance"
              checked={priorityVal === 'balance'}
              onChange={() => setPriorityVal('balance')}
              title="전체적인 균형"
              description="모든 축을 고르게 반영"
              visual={<BalanceGlyph />}
            />
          </div>
          {/* 선택이 엔진 가중치를 실제로 어떻게 바꾸는지 — 실제 WEIGHT_PRESETS 합산값. */}
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 rounded-card bg-surface-raised px-3.5 py-2.5">
            <span className="text-[11.5px] font-semibold uppercase tracking-wide text-text-tertiary">가중치 배분</span>
            {weightGroups(priorityVal).map((g) => (
              <span key={g.label} className="flex items-center gap-1.5 text-[12px] text-text-sub">
                {g.label}
                <span aria-hidden className="h-[5px] w-14 overflow-hidden rounded-full bg-hero-soft">
                  <span
                    className="block h-full rounded-full bg-primary transition-[width] duration-300"
                    style={{ width: `${Math.round(g.value * 100)}%` }}
                  />
                </span>
                <span className="tabular-nums text-text">{Math.round(g.value * 100)}%</span>
              </span>
            ))}
          </div>
        </fieldset>

        <fieldset className="m-0 border-0 p-0">
          <legend className="mb-2 block text-sm font-semibold text-text">두 번째로 중요한 기준 (선택)</legend>
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="두 번째로 중요한 기준">
            {PRIORITY_SECONDARY_OPTIONS.map((o) => {
              const disabled = o.value !== 'none' && o.value === priorityVal;
              return (
                <label
                  key={o.value}
                  className={`flex min-h-8 items-center rounded-full px-3.5 text-[12.5px] font-semibold transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary ${
                    disabled
                      ? 'cursor-not-allowed bg-white/[0.02] text-text-tertiary/60'
                      : secondaryVal === o.value
                        ? 'cursor-pointer bg-primary-strong text-white'
                        : 'cursor-pointer bg-white/[0.04] text-text-sub hover:text-text'
                  }`}
                >
                  <input
                    type="radio"
                    name="prioritySecondary"
                    value={o.value}
                    checked={secondaryVal === o.value}
                    disabled={disabled}
                    onChange={() => setSecondaryVal(o.value)}
                    className="sr-only"
                  />
                  {o.label}
                </label>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="m-0 border-0 p-0">
          <legend className="mb-2 block text-sm font-semibold text-text">
            더 좋은 상영 환경이라면 추가 비용을 얼마나 낼 수 있나요?
          </legend>
          <div className="flex flex-col gap-2" role="radiogroup" aria-label="추가 지불 의향">
            {PREMIUM_ALLOWANCE_OPTIONS.map((o) => (
              <label
                key={o.value}
                className="group flex min-h-[48px] cursor-pointer items-center gap-3 rounded-card bg-surface-raised px-3.5 py-2 transition-colors has-[:checked]:bg-primary-soft has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary"
              >
                <input
                  type="radio"
                  name="premiumAllowance"
                  value={o.value}
                  defaultChecked={o.value === 'experience_first'}
                  className="sr-only"
                />
                <span
                  aria-hidden
                  className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border border-border-strong transition-colors group-has-[:checked]:border-primary-strong"
                >
                  <span className="h-2 w-2 rounded-full bg-transparent transition-colors group-has-[:checked]:bg-primary-strong" />
                </span>
                <span className="min-w-0 flex-1 text-[14.5px] font-medium text-text">{o.label}</span>
                <span className="shrink-0 text-[12px] tabular-nums text-text-tertiary">{o.hint}</span>
              </label>
            ))}
          </div>
          <p className="m-0 mt-2 text-[12.5px] leading-snug text-text-tertiary">
            일반관 최저가를 기준으로 추가 지불 한도를 계산해요 — 절대 금액은 입력하지 않아도 돼요.
          </p>
        </fieldset>
      </StepSection>
      </div>

      <div className={step === 2 ? 'stage-enter' : 'hidden'} data-step-last>
      <StepSection step={3} title="관람할 때 피하고 싶은 조건이 있나요?" first numbered={false}>
        <p className="m-0 mb-2 text-[13px] text-text-sub">복수 선택할 수 있어요.</p>
        <div className="flex flex-col gap-2">
          <ToggleRow
            name="avoidFront"
            title="앞쪽 좌석은 불편해요"
            effect="스크린에서 떨어진 중·후방 구역을 먼저 추천해요"
            checked={avoid.front}
            onChange={(on) => setAvoidFlag('front', on)}
            visual={<SeatGlyph lit={(r, c) => r === 3 && c >= 2 && c <= 4} />}
          />
          <ToggleRow
            name="bigScreenSensitive"
            title="화면이 너무 크면 멀미가 나요"
            effect="IMAX 확장 화면 후보를 제외해요"
            checked={avoid.bigScreen}
            onChange={(on) => setAvoidFlag('bigScreen', on)}
            visual={<ScreenGlyph ratio={1.43} />}
          />
          <ToggleRow
            name="neckComfort"
            title="목을 많이 들어야 하는 자리는 피하고 싶어요"
            effect="고개를 덜 들어도 되는 구역을 먼저 추천해요"
            checked={avoid.neck}
            onChange={(on) => setAvoidFlag('neck', on)}
            visual={<SeatGlyph lit={(r, c) => r === 3 && c >= 2 && c <= 4} />}
          />
          <ToggleRow
            name="subtitleReadability"
            title="자막을 편하게 읽을 수 있어야 해요"
            effect="자막이 잘 보이는 중앙·중간열 구역의 점수를 높여요"
            checked={avoid.subtitle}
            onChange={(on) => setAvoidFlag('subtitle', on)}
            visual={<SeatGlyph lit={(r, c) => r === 1 && c >= 2 && c <= 4} />}
          />
          <ToggleRow
            title="강한 진동이나 움직이는 좌석은 피하고 싶어요"
            effect="4DX 회차를 후보에서 제외해요"
            checked={avoid.vibration}
            onChange={(on) => setAvoidFlag('vibration', on)}
            visual={<ScreenGlyph ratio={1.85} />}
          />
          <ToggleRow
            name="wheelchair"
            title="휠체어·엘리베이터 접근이 필요해요"
            effect="접근이 확인되지 않은 상영관은 제외해요"
            checked={avoid.wheelchair}
            onChange={(on) => setAvoidFlag('wheelchair', on)}
            visual={<SeatGlyph lit={(r, c) => r === 3 && c <= 1} />}
          />
          <ToggleRow
            title="해당 없음"
            effect="피하고 싶은 조건 없이 추천받아요"
            checked={noneAvoided}
            onChange={() => clearAvoid()}
          />
        </div>
        {/* 진동·모션 회피 → 기존 멀미 민감도(2=4DX 하드 제외)로 전달 */}
        <input type="hidden" name="motionSickness" value={avoid.vibration ? 2 : 0} />
      </StepSection>
      </div>

      {/* 데스크톱 인라인 CTA(R15 §5) — 전체 폭 고정 바 대신 입력 영역 안에서 240px 버튼.
          모바일 sticky 바는 lg 미만 전용. */}
      <div className="mt-8 hidden items-center gap-3 border-t border-border pt-6 lg:flex">
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
            key="next-desktop"
            type="button"
            onClick={() => setStep((s) => s + 1)}
            className="btn-cta flex min-h-12 w-[240px] items-center justify-center rounded-card bg-primary-strong text-[15px] font-semibold text-white hover:bg-primary-strong-hover"
          >
            {NEXT_LABELS[step]}
          </button>
        ) : (
          <button
            key="submit-desktop"
            type="submit"
            className="btn-cta flex min-h-12 w-[240px] items-center justify-center rounded-card bg-primary-strong text-[15px] font-semibold text-white hover:bg-primary-strong-hover"
            disabled={submitting}
          >
            {submitting ? '추천 계산 중…' : '결과 확인하기 →'}
          </button>
        )}
      </div>
      </div>

      {/* 데스크톱 요약 패널 — 선택한 영화 + 현재 조건 + 실시간 후보 수. 조건을 조절할수록
          결과가 좁혀지는 것이 바로 보인다. */}
      <aside className="hidden lg:block" aria-label="현재 조건 요약">
        {/* 영화 정보(채움 카드)와 조건·후보 수(외곽선 카드)를 다른 표면 문법으로 구분 —
            라벨 kicker도 각각 붙여 두 블록이 한 덩어리로 읽히지 않게 한다. */}
        <div className="sticky top-24 flex flex-col gap-5">
          <div>
            <p className="m-0 mb-2 text-[12px] font-semibold uppercase tracking-wide text-text-tertiary">선택한 영화</p>
            <MovieSummary movie={movie} />
          </div>
          <div className="rounded-card-lg border border-border bg-surface p-4">
            <p className="m-0 text-[12px] font-semibold uppercase tracking-wide text-primary">현재 조건</p>
            {/* 표가 아니라 문장 요약(R19) — "오늘 · 저녁 / 강남역 출발 / 편도 45분 이내". */}
            <p className="m-0 mt-2.5 flex flex-col gap-1 text-[14.5px] font-medium tabular-nums leading-snug text-text">
              {summaryLines.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </p>
            <div className="mt-3.5 border-t border-border pt-3.5" role="status" aria-live="polite">
              {preview ? (
                <>
                  <p className="m-0 text-[14px] font-bold tabular-nums text-text">
                    조건에 맞는 후보{' '}
                    {prevCount !== null ? (
                      <span className="text-text-tertiary">
                        {prevCount}개 <span aria-hidden>→</span>{' '}
                      </span>
                    ) : null}
                    <span className="text-primary">{preview.candidates}개</span>
                  </p>
                  {/* 후보 변화 내역(R15 §5) — 조건이 후보를 어떻게 좁히는지 단계별로. */}
                  {preview.funnel ? (
                    <ol className="m-0 mt-2 flex list-none flex-col gap-1 p-0 text-[12.5px] tabular-nums text-text-sub">
                      <li className="flex justify-between gap-3">
                        전체 후보 <span>{preview.funnel.total}개</span>
                      </li>
                      <li className="flex justify-between gap-3">
                        이동시간 적용 <span>{preview.funnel.afterTravel}개</span>
                      </li>
                      <li className="flex justify-between gap-3">
                        가격 조건 적용 <span>{preview.funnel.afterPrice}개</span>
                      </li>
                      <li className="flex justify-between gap-3 font-semibold text-text">
                        포맷·조건 반영 <span className="text-primary">{preview.funnel.final}개</span>
                      </li>
                    </ol>
                  ) : (
                    <p className="m-0 mt-0.5 text-[12px] tabular-nums text-text-tertiary">전체 {preview.total}개 회차 중</p>
                  )}
                </>
              ) : (
                <p className="m-0 text-[13px] text-text-tertiary">후보 계산 중…</p>
              )}
            </div>
            {/* 탐색 반경 그래픽(R15 §5) — 최대 이동 시간을 동심원의 활성 링으로 표현. */}
            <div aria-hidden className="mt-3.5 flex items-center gap-3 border-t border-border pt-3.5">
              <span className="relative block h-14 w-14 shrink-0">
                {[1, 0.66, 0.33].map((f) => (
                  <span
                    key={f}
                    className="absolute rounded-full border border-border"
                    style={{ inset: `${(1 - f) * 50}%` }}
                  />
                ))}
                <span
                  className="absolute rounded-full border border-primary/70 transition-all duration-300"
                  style={{ inset: `${(1 - Math.min(1, travelVal / 120)) * 50}%` }}
                />
                <span className="absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary" />
              </span>
              <p className="m-0 text-[12px] leading-snug text-text-tertiary">
                출발 위치 기준 이동 {travelVal}분 반경에서 회차를 찾아요.
              </p>
            </div>
          </div>
        </div>
      </aside>
      </div>

      {/* 모바일 sticky CTA(R15 §5) — 반투명 다크 표면 + blur, 버튼 54px + 상단 edge
          highlight + press state. 단계별 문구로 다음에 무엇이 오는지 알려준다. 데스크톱은
          아래 인라인 CTA가 담당(lg:hidden). */}
      <div
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/90 px-4 py-3 backdrop-blur-md lg:hidden"
        style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
      >
        {preview ? (
          <p className="m-0 mb-2 text-center text-[12px] tabular-nums text-text-sub" role="status">
            현재 조건에 맞는 후보{' '}
            {prevCount !== null ? (
              <span className="text-text-tertiary">
                {prevCount}개 <span aria-hidden>→</span>{' '}
              </span>
            ) : null}
            <strong className="font-bold text-primary">{preview.candidates}개</strong>
          </p>
        ) : null}
        <div className="mx-auto flex max-w-content items-center gap-3">
          {step > 0 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="min-h-[54px] shrink-0 rounded-card border border-border px-5 text-[15px] font-medium text-text-sub transition-colors hover:text-text"
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
              className="btn-cta flex min-h-[54px] flex-1 items-center justify-center rounded-card bg-primary-strong text-base font-semibold text-white hover:bg-primary-strong-hover"
            >
              {NEXT_LABELS[step]}
            </button>
          ) : (
            <button
              key="submit"
              type="submit"
              className="btn-cta flex min-h-[54px] flex-1 items-center justify-center rounded-card bg-primary-strong text-base font-semibold text-white hover:bg-primary-strong-hover"
              disabled={submitting}
            >
              {submitting ? '추천 계산 중…' : '결과 확인하기 →'}
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
