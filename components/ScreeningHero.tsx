'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { IconArrowRight } from './Icon';

// 실제 특정 상영관을 가리키지 않는, "CineFit이 무엇을 비교하는지" 보여주는 예시 값들 —
// 화면비·포맷·좌석·이동시간은 전부 실제 서비스가 다루는 항목이고 숫자는 대표값일 뿐,
// 특정 영화·상영관·회차를 지어낸 것이 아니다. seatHighlight는 seat 라벨 문구와 일치하는
// 대략적 좌석 그리드 강조 영역(행/열 인덱스 범위) — "핵심 좌석 일부만 은은하게" 원칙에
// 맞춰 블록을 좁게 잡는다.
const STAGE_FRAMES = [
  { ratio: 2.39, format: 'IMAX', seat: '중앙 블록', travel: '24분', seatHighlight: { rows: [2, 3], cols: [4, 7] } },
  { ratio: 2.2, format: '돌비시네마', seat: '뒤쪽 중앙', travel: '18분', seatHighlight: { rows: [3, 4], cols: [4, 7] } },
  { ratio: 1.85, format: '일반관', seat: '가운데 열', travel: '12분', seatHighlight: { rows: [2, 2], cols: [3, 8] } },
] as const;

const RATIOS = STAGE_FRAMES.map((f) => f.ratio);
const MIN_RATIO = Math.min(...RATIOS);
const MAX_RATIO = Math.max(...RATIOS);

const SEAT_ROWS = 5;
const SEAT_COLS = 12;
const ROTATE_MS = 4200;

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="m-0 text-[11px] font-semibold uppercase tracking-wide text-hero-text-sub">{label}</p>
      <p className="m-0 mt-1 truncate text-[15px] font-semibold text-hero-text">{value}</p>
    </div>
  );
}

/**
 * 홈 히어로 — "Red-Pink Cinema Tech(절제판)" 개편(12차). 데스크톱은 좌(헤드라인·설명·CTA) /
 * 우(포맷 반응형 스크린 시뮬레이터 + 좌석 배열)의 분할 구성으로 화면 높이를 적극 사용하고,
 * 모바일은 세로 흐름을 유지한다. 헤드라인은 광고 포스터식 과장 없이 "이 영화,"(작게) /
 * "어디서 봐야"(가장 크게·로즈 그라데이션) / "할까요?"(한 단계 작게)의 차분한 브랜드
 * 타이포(.type-display, 기울임 없음). 스크린은 네온이 아니라 얇은 와인 간접광, 추천 좌석은
 * 좁은 핵심 블록만 은은하게 점등(.seat-light 스태거), 배경 객석은 실루엣 수준.
 * 포맷 탭을 직접 누르면 자동 순환이 멈추고, prefers-reduced-motion에서는 자동 전환·등장
 * 애니메이션 모두 꺼진다.
 */
export function ScreeningHero() {
  const [frame, setFrame] = useState(0);
  const [paused, setPaused] = useState(false);
  const [userPicked, setUserPicked] = useState(false);
  const reducedMotion = useRef(false);

  useEffect(() => {
    reducedMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  useEffect(() => {
    if (paused || userPicked || reducedMotion.current) return;
    const id = setInterval(() => {
      setFrame((f) => (f + 1) % STAGE_FRAMES.length);
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, [paused, userPicked]);

  const current = STAGE_FRAMES[frame];
  const isImax = current.format === 'IMAX';
  const isDolby = current.format === '돌비시네마';
  const screenWidthPct = 55 + ((current.ratio - MIN_RATIO) / (MAX_RATIO - MIN_RATIO || 1)) * 35;
  const { rows: hlRows, cols: hlCols } = current.seatHighlight;

  return (
    <section className="enter-1 px-5 pb-12 pt-10 sm:px-10 sm:pt-16 lg:pb-16">
      <div className="mx-auto grid max-w-wide items-center gap-10 lg:min-h-[72vh] lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-14">
        {/* 좌: 헤드라인·설명·CTA */}
        <div>
          <h1 className="m-0 flex flex-col gap-1 break-keep">
            <span
              className="hero-word type-display block text-[6vw] text-text-sub sm:text-[24px]"
              style={{ animationDelay: '0ms' }}
            >
              이 영화,
            </span>{' '}
            <span
              className="hero-word type-display text-gradient-primary block w-fit pr-2 text-[11.5vw] sm:text-[58px]"
              style={{ animationDelay: '120ms' }}
            >
              어디서 봐야
            </span>{' '}
            <span
              className="hero-word type-display block text-[9vw] text-text sm:text-[46px]"
              style={{ animationDelay: '240ms' }}
            >
              할까요?
            </span>
          </h1>
          <p className="mt-6 max-w-lg break-keep text-[15.5px] leading-[1.65] text-text-sub sm:text-base">
            영화의 화면비부터 좌석, 이동시간, 가격까지 한 번에 비교해 가장 잘 맞는 상영관을 찾습니다.
          </p>
          <div className="mt-7 flex">
            <Link
              href="/movies"
              className="group inline-flex min-h-12 items-center justify-center gap-1.5 rounded-card bg-primary-strong px-8 text-base font-semibold text-white transition-all hover:bg-primary-strong-hover hover:shadow-glow-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary active:scale-[0.98]"
            >
              영화 선택하기
              <IconArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>

        {/* 우: 스크린 시뮬레이터 — 하나의 중심(스크린). 카드 테두리 없이 표면과 간접광만. */}
        <div
          className="relative overflow-hidden rounded-card-xl bg-hero px-5 py-7 shadow-glow-primary sm:px-8 sm:py-9"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          {/* 배경 객석 실루엣 — 아래쪽에서 옥스블러드가 아주 옅게 올라오는 간접 조명. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2"
            style={{ background: 'radial-gradient(ellipse 80% 110% at 50% 130%, rgba(93, 24, 40, 0.45), transparent 70%)' }}
          />

          <div className="relative flex flex-wrap items-center justify-between gap-3">
            <p className="m-0 shrink-0 text-[12px] font-semibold uppercase tracking-wide text-hero-text-sub">
              포맷별 관람 조건
            </p>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="상영 포맷 선택">
              {STAGE_FRAMES.map((f, i) => (
                <button
                  key={f.format}
                  type="button"
                  aria-pressed={i === frame}
                  onClick={() => {
                    setFrame(i);
                    setUserPicked(true);
                  }}
                  className={`rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${
                    i === frame
                      ? 'bg-primary-strong text-white'
                      : 'text-hero-text-sub hover:text-hero-text'
                  }`}
                >
                  {f.format}
                </button>
              ))}
            </div>
          </div>

          <div key={frame} className="stage-enter relative mt-8 flex flex-col items-center">
            {/* 스크린 무대 — 포맷이 바뀌어도 무대 높이는 고정(min-h)해 레이아웃이 출렁이지
                않게 하고, 그 안에서 스크린이 세로 중앙 정렬된 채 폭·비율만 변한다. */}
            <div className="flex min-h-[190px] w-full items-center justify-center sm:min-h-[225px]">
            <div
              className="relative flex w-full max-w-[560px] flex-col items-center transition-[width] duration-[550ms] ease-out"
              style={{ width: `${screenWidthPct}%` }}
            >
              {isDolby ? (
                <>
                  <span
                    aria-hidden
                    className="dolby-pulse pointer-events-none absolute inset-x-0 top-0 rounded-[10px] border border-primary/30"
                    style={{ aspectRatio: `${current.ratio} / 1` }}
                  />
                  <span
                    aria-hidden
                    className="dolby-pulse pointer-events-none absolute inset-x-0 top-0 rounded-[10px] border border-primary/30"
                    style={{ aspectRatio: `${current.ratio} / 1`, animationDelay: '700ms' }}
                  />
                </>
              ) : null}
              <div
                className="relative flex w-full items-center justify-center overflow-hidden rounded-[10px] border border-white/10"
                style={{
                  aspectRatio: `${current.ratio} / 1`,
                  background:
                    'linear-gradient(180deg, rgba(93, 24, 40, 0.32) 0%, rgba(36, 28, 31, 0.92) 55%, rgba(26, 22, 24, 0.96) 100%)',
                  boxShadow: isImax
                    ? 'inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 0 0 1px rgba(201, 111, 132, 0.35), 0 22px 70px -22px rgba(135, 43, 66, 0.6)'
                    : 'inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 22px 70px -22px rgba(135, 43, 66, 0.45)',
                }}
              >
                {/* 상단 하이라이트 — 중앙이 밝고 가장자리로 사라지는 와인 라인(단선 테두리 대체). */}
                <span
                  aria-hidden
                  className="absolute inset-x-4 top-0 h-px"
                  style={{ background: 'linear-gradient(90deg, transparent, rgba(201, 111, 132, 0.85), transparent)' }}
                />
                <span className="whitespace-nowrap text-[21px] font-light tracking-[0.16em] tabular-nums text-hero-text sm:text-[25px]">
                  {current.ratio.toFixed(2)}:1
                </span>
                {isImax ? (
                  <span className="absolute right-2.5 top-2 rounded-full border border-primary px-2 py-px text-[10px] font-bold uppercase tracking-wide text-primary">
                    확장
                  </span>
                ) : null}
              </div>
              {/* 스크린 불빛이 객석으로 번지는 간접광. */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-[-8%] top-full h-20 opacity-50"
                style={{ background: 'radial-gradient(ellipse 60% 90% at 50% 0%, rgba(93, 24, 40, 0.5), transparent 70%)' }}
              />
            </div>
            </div>

            {/* 객석 — 실루엣 수준의 좌석 점. 추천 구역의 좁은 핵심 블록만 은은하게 점등. */}
            <div aria-hidden className="mt-8 flex w-full flex-col items-center gap-[5px]">
              {Array.from({ length: SEAT_ROWS }, (_, r) => (
                <div
                  key={r}
                  className="flex justify-center gap-[5px]"
                  style={{ width: `${58 + r * 5}%`, maxWidth: '420px' }}
                >
                  {Array.from({ length: SEAT_COLS }, (_, c) => {
                    const highlighted = r >= hlRows[0] && r <= hlRows[1] && c >= hlCols[0] && c <= hlCols[1];
                    return (
                      <span
                        key={c}
                        className={`h-[7px] flex-1 rounded-[2px] ${
                          highlighted ? 'seat-light bg-gradient-to-b from-primary/80 to-primary-strong' : 'bg-hero-soft/70'
                        }`}
                        style={highlighted ? { animationDelay: `${(r - hlRows[0]) * 60 + (c - hlCols[0]) * 25}ms` } : undefined}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          <div className="relative mt-7 flex flex-wrap items-start gap-x-8 gap-y-4 border-t border-hero-border pt-5">
            <HeroStat label="추천 좌석 구역" value={current.seat} />
            <span aria-hidden className="hidden h-8 w-px bg-hero-border sm:block" />
            <HeroStat label="이동 시간" value={current.travel} />
            <p className="m-0 ml-auto hidden max-w-[220px] text-right text-[12px] leading-relaxed text-hero-text-sub sm:block">
              포맷을 바꾸면 화면비·좌석·이동 조건이 함께 달라져요.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
