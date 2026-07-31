'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { IconArrowRight } from './Icon';

// 실제 특정 상영관을 가리키지 않는, "CineFit이 무엇을 비교하는지" 보여주는 예시 값들 —
// 화면비·포맷·좌석·이동시간은 전부 실제 서비스가 다루는 항목이고 숫자는 대표값일 뿐,
// 특정 영화·상영관·회차를 지어낸 것이 아니다. seatHighlight는 seat 라벨 문구와 일치하는
// 대략적 좌석 그리드 강조 영역(행/열 인덱스 범위)이다.
const STAGE_FRAMES = [
  { ratio: 2.39, format: 'IMAX', seat: '중앙 블록', travel: '24분', seatHighlight: { rows: [1, 3], cols: [4, 7] } },
  { ratio: 2.2, format: '돌비시네마', seat: '뒤쪽 중앙', travel: '18분', seatHighlight: { rows: [3, 4], cols: [4, 7] } },
  { ratio: 1.85, format: '일반관', seat: '가운데 열', travel: '12분', seatHighlight: { rows: [2, 2], cols: [2, 9] } },
] as const;

const RATIOS = STAGE_FRAMES.map((f) => f.ratio);
const MIN_RATIO = Math.min(...RATIOS);
const MAX_RATIO = Math.max(...RATIOS);

const SEAT_ROWS = 5;
const SEAT_COLS = 12;
const ROTATE_MS = 3800;

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="m-0 text-[11px] font-semibold uppercase tracking-wide text-hero-text-sub">{label}</p>
      <p className="m-0 mt-1 truncate text-[15px] font-semibold text-hero-text">{value}</p>
    </div>
  );
}

/**
 * 홈 히어로 — "Cinematic Tech" 개편(11차). 제목은 "이 영화,"(작게) / "어디서"(1.15배·버건디·
 * 헤드라인 서체) / "봐야 할까요?"(보통)를 줄마다 어긋난 시작 위치로 배치하고 단어별로 아래에서
 * 떠오르게 한다(.hero-word). 히어로 카드는 장식 블록이 아니라 "라이브 추천 스테이지"다:
 * 포맷 탭(IMAX/돌비시네마/일반관)을 직접 누르면 스크린 사각형의 가로폭이 실제 화면비에
 * 비례해 변하고, 화면비 숫자는 스크린 안에 크게 표시되며, 스크린 아래 좌석 점 그리드에서
 * 추천 구역(seat 라벨과 일치하는 위치)이 버건디로 강조되고, 이동 시간이 함께 갱신된다.
 * 돌비시네마는 스크린 주변 음파 펄스(.dolby-pulse), IMAX는 별도 링 강조(형태 왜곡 없음).
 * 탭을 직접 누르기 전까지는 3~4초 간격 자동 전환, 호버 시 정지, prefers-reduced-motion에서는
 * 자동 전환·등장 애니메이션 모두 꺼진다.
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
    <section className="enter-1 px-5 pb-10 pt-10 sm:px-10 sm:pb-14 sm:pt-16">
      <div className="mx-auto max-w-wide">
        <h1 className="m-0 flex flex-col break-keep">
          <span
            className="hero-word block font-headline text-[6.5vw] font-semibold leading-[1.2] text-text-sub sm:text-[26px]"
            style={{ animationDelay: '0ms' }}
          >
            이 영화,
          </span>{' '}
          <span
            className="hero-word ml-[5vw] block font-headline text-[10vw] font-extrabold leading-[1.05] text-primary sm:ml-9 sm:text-[46px]"
            style={{ animationDelay: '120ms' }}
          >
            어디서
          </span>{' '}
          <span
            className="hero-word ml-[2vw] block font-headline text-[8.5vw] font-bold leading-[1.15] text-text sm:ml-3 sm:text-[40px]"
            style={{ animationDelay: '240ms' }}
          >
            봐야 할까요?
          </span>
        </h1>
        <p className="mt-5 max-w-lg break-keep text-[15.5px] leading-[1.6] text-text-sub sm:text-base">
          영화의 화면비부터 좌석, 이동시간, 가격까지 한 번에 비교해 가장 잘 맞는 상영관을 찾습니다.
        </p>
        <div className="mt-6 flex">
          <Link
            href="/movies"
            className="group inline-flex min-h-12 items-center justify-center gap-1.5 rounded-card bg-primary-strong px-8 text-base font-semibold text-white transition-all hover:bg-primary-strong-hover hover:shadow-float focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-strong active:scale-[0.98]"
          >
            영화 선택하기
            <IconArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>

      <div
        className="relative mx-auto mt-10 max-w-wide overflow-hidden rounded-card-xl bg-hero px-5 py-7 sm:mt-12 sm:px-8 sm:py-8"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="m-0 shrink-0 text-[12px] font-semibold uppercase tracking-wide text-hero-text-sub">
            포맷별 관람 조건 비교
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
                className={`rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${
                  i === frame
                    ? 'border-primary-strong bg-primary-strong text-white'
                    : 'border-hero-border text-hero-text-sub hover:text-hero-text'
                }`}
              >
                {f.format}
              </button>
            ))}
          </div>
        </div>

        <div key={frame} className="stage-enter relative mt-8 flex flex-col items-center">
          {/* 스크린 — 화면비를 그대로 가진 넓고 낮은 사각형. 안에 화면비 숫자를 크게 표시해
              "빈 장식 도형"이 아니라 데이터 그 자체가 되게 한다. 아래로 은은한 스크린 불빛이
              객석 쪽으로 번진다. */}
          <div
            className="relative flex w-full max-w-[560px] flex-col items-center transition-[width] duration-700 ease-out"
            style={{ width: `${screenWidthPct}%` }}
          >
            {isDolby ? (
              <>
                <span
                  aria-hidden
                  className="dolby-pulse pointer-events-none absolute inset-x-0 top-0 rounded-t-[16px] rounded-b-[4px] border border-accent/60"
                  style={{ aspectRatio: `${current.ratio} / 1` }}
                />
                <span
                  aria-hidden
                  className="dolby-pulse pointer-events-none absolute inset-x-0 top-0 rounded-t-[16px] rounded-b-[4px] border border-accent/60"
                  style={{ aspectRatio: `${current.ratio} / 1`, animationDelay: '700ms' }}
                />
              </>
            ) : null}
            <div
              className={`relative flex w-full items-center justify-center rounded-t-[16px] rounded-b-[4px] border border-hero-border border-t-2 border-t-accent bg-gradient-to-b from-hero-soft to-transparent ${
                isImax ? 'shadow-[0_0_0_1px_var(--primary),0_0_24px_-4px_var(--primary)]' : ''
              }`}
              style={{ aspectRatio: `${current.ratio} / 1` }}
            >
              <span className="font-mono text-[22px] font-bold tracking-[0.08em] text-hero-text sm:text-[28px]">
                {current.ratio.toFixed(2)}:1
              </span>
              {isImax ? (
                <span className="absolute right-2.5 top-2 rounded-full border border-primary px-2 py-px text-[10px] font-bold uppercase tracking-wide text-primary">
                  확장
                </span>
              ) : null}
            </div>
            {/* 스크린 불빛이 객석으로 번지는 라이트 스필 — 사진이 아닌 그라데이션 하나로
                공간감을 만든다. */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-[-10%] top-full h-24 opacity-60"
              style={{ background: 'radial-gradient(ellipse 60% 90% at 50% 0%, var(--hero-soft), transparent 70%)' }}
            />
          </div>

          {/* 객석 — 좌석 점 그리드. 추천 구역(현재 프레임의 seat 라벨과 같은 위치)만 버건디로
              강조된다. 뒷줄로 갈수록 폭이 넓어져 객석의 부채꼴 깊이를 암시한다. */}
          <div aria-hidden className="mt-7 flex w-full flex-col items-center gap-[5px]">
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
                      className={`h-[7px] flex-1 rounded-[2px] transition-colors duration-500 ${
                        highlighted ? 'bg-gradient-to-b from-primary to-primary-strong' : 'bg-hero-soft'
                      }`}
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
    </section>
  );
}
