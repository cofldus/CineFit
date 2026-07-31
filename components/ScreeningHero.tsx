'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { IconArrowRight, IconSeat, IconTransit } from './Icon';

// 실제 특정 상영관을 가리키지 않는, "CineFit이 무엇을 비교하는지" 보여주는 예시 값들 —
// 화면비·포맷·좌석·이동시간은 전부 실제 서비스가 다루는 항목이고 숫자는 대표값일 뿐,
// 특정 영화·상영관·회차를 지어낸 것이 아니다.
const STAGE_FRAMES = [
  { ratio: 2.39, format: 'IMAX', seat: '중앙 블록', travel: '24분' },
  { ratio: 2.2, format: '돌비시네마', seat: '뒤쪽 중앙', travel: '18분' },
  { ratio: 1.85, format: '일반관', seat: '가운데 열', travel: '12분' },
];

const ROTATE_MS = 3800;

/**
 * 홈 히어로 — "Cinema Selection Desk". 헤드라인 아래에 화면 전체 폭의 어두운(night) 스테이지
 * 하나를 두고, 그 안에서만 화면비→포맷→좌석→이동시간 예시가 3~4초 간격으로 자동 전환된다
 * (하나의 인터랙티브 무대 — 이전처럼 오른쪽에 작은 흐름 그래픽을 따로 두지 않는다). 히어로
 * 전체를 어둡게 하지 않고 이 스테이지 영역만 어둡다("프로젝터가 켜진 순간"). 마우스를 올리면
 * 자동 전환이 멈춘다. prefers-reduced-motion에서는 자동 전환 자체를 하지 않는다.
 */
export function ScreeningHero() {
  const [frame, setFrame] = useState(0);
  const [paused, setPaused] = useState(false);
  const reducedMotion = useRef(false);

  useEffect(() => {
    reducedMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  useEffect(() => {
    if (paused || reducedMotion.current) return;
    const id = setInterval(() => {
      setFrame((f) => (f + 1) % STAGE_FRAMES.length);
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, [paused]);

  const current = STAGE_FRAMES[frame];

  return (
    <section className="enter-1 px-5 pb-10 pt-10 sm:px-10 sm:pb-14 sm:pt-16">
      <div className="mx-auto max-w-wide text-center">
        <h1 className="m-0 break-keep font-wanted text-[9vw] font-extrabold leading-[1.15] tracking-[-0.02em] text-text sm:text-5xl lg:text-6xl">
          이 영화, <span className="text-primary-strong">어디서</span> 봐야 할까요?
        </h1>
        <p className="mx-auto mt-4 max-w-lg break-keep text-[15.5px] leading-[1.6] text-text-sub sm:text-base">
          영화의 화면비부터 좌석, 이동시간, 가격까지 한 번에 비교해 가장 잘 맞는 상영관을 찾습니다.
        </p>
        <div className="mt-6 flex justify-center">
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
        className="relative mx-auto mt-10 max-w-wide overflow-hidden rounded-card-xl bg-hero shadow-glow-primary sm:mt-12"
        style={{ aspectRatio: '2.4 / 1' }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 sm:gap-6">
          <div key={frame} className="stage-enter flex flex-col items-center gap-4 sm:flex-row sm:gap-8">
            <div className="flex flex-col items-center gap-1.5">
              <div
                aria-hidden
                className="rounded-[4px] border border-hero-border bg-hero-soft"
                style={{ height: '44px', width: 'auto', aspectRatio: `${current.ratio} / 1` }}
              />
              <span className="font-mono text-sm text-hero-text-sub">{current.ratio.toFixed(2)}:1</span>
            </div>
            <div className="hidden h-10 w-px bg-hero-border sm:block" />
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm font-medium text-hero-text-sub sm:text-base">
              <span className="inline-flex items-center gap-1.5">
                <span className="rounded-full border border-hero-border px-2.5 py-0.5 text-hero-text">{current.format}</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <IconSeat className="h-4 w-4" /> {current.seat}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <IconTransit className="h-4 w-4" /> 이동 {current.travel}
              </span>
            </div>
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5 sm:bottom-4">
          {STAGE_FRAMES.map((f, i) => (
            <span
              key={f.ratio}
              aria-hidden
              className={`h-1.5 rounded-full transition-all ${i === frame ? 'w-4 bg-hero-text' : 'w-1.5 bg-hero-border'}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
