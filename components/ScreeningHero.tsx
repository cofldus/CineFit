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
 * 홈 히어로 — "Graphite Cinema" 개편(3차). 이전 버전은 2.4:1 고정 비율의 큰 사각형 안에
 * 작은 정보만 중앙에 떠 있어 "텅 빈 화면"으로 보인다는 피드백 — 그 자리를 실제 비교 과정
 * (화면비 → 포맷 → 좌석 → 이동시간)을 4단계로 나란히 보여주는, 내용 크기에 맞는 카드로
 * 바꿨다. 예시 값 세트는 3~4초 간격으로 자동 전환되고, 마우스를 올리면 멈춘다.
 * prefers-reduced-motion에서는 자동 전환 자체를 하지 않는다.
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
        <h1 className="m-0 break-keep text-[9vw] font-bold leading-[1.3] tracking-normal text-text sm:text-5xl lg:text-6xl">
          이 영화, <span className="text-primary">어디서</span> 봐야 할까요?
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
        className="relative mx-auto mt-10 max-w-wide rounded-card-xl bg-hero px-5 py-6 shadow-glow-primary sm:mt-12 sm:px-8 sm:py-7"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {/* 프로그램 노트처럼 좌우 룰선 + 라벨 — SaaS 다이어그램이 아니라 극장 프로그램 안내
            같은 인상을 주는 최소한의 장식(브리프: "cinema guide / program summary"). */}
        <div className="flex items-center gap-3">
          <span aria-hidden className="h-px flex-1 bg-accent/25" />
          <p className="m-0 shrink-0 text-[12px] font-semibold uppercase tracking-wide text-hero-text-sub">
            오늘의 상영 비교 기준
          </p>
          <span aria-hidden className="h-px flex-1 bg-accent/25" />
        </div>
        <div key={frame} className="stage-enter mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-0">
          <div className="flex flex-1 items-center gap-3 sm:flex-col sm:items-start sm:gap-2">
            {/* 화면비 스와치 — 아래쪽에 얇은 브론즈 트림을 둬서 "스크린 하단 조명" 느낌을
                준다(장식이되 네온 글로우는 아님). */}
            <div
              aria-hidden
              className="shrink-0 rounded-t-[3px] border-x border-t border-hero-border border-b-2 border-b-accent/60 bg-hero-soft"
              style={{ height: '32px', width: 'auto', aspectRatio: `${current.ratio} / 1` }}
            />
            <div className="min-w-0">
              <p className="m-0 text-[11px] font-semibold uppercase tracking-wide text-hero-text-sub">화면비</p>
              <p className="m-0 font-mono text-[15px] font-semibold text-hero-text">{current.ratio.toFixed(2)}:1</p>
            </div>
          </div>
          <IconArrowRight aria-hidden className="hidden h-4 w-4 shrink-0 text-hero-text-sub sm:mx-4 sm:block" />
          <IconArrowRight aria-hidden className="h-4 w-4 shrink-0 rotate-90 text-hero-text-sub sm:hidden" />
          <div className="flex flex-1 items-center gap-3 sm:flex-col sm:items-start sm:gap-2">
            <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-accent/50" />
            <div className="min-w-0">
              <p className="m-0 text-[11px] font-semibold uppercase tracking-wide text-hero-text-sub">포맷</p>
              <p className="m-0 truncate text-[15px] font-semibold text-hero-text">{current.format}</p>
            </div>
          </div>
          <IconArrowRight aria-hidden className="hidden h-4 w-4 shrink-0 text-hero-text-sub sm:mx-4 sm:block" />
          <IconArrowRight aria-hidden className="h-4 w-4 shrink-0 rotate-90 text-hero-text-sub sm:hidden" />
          <div className="flex flex-1 items-center gap-3 sm:flex-col sm:items-start sm:gap-2">
            <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-accent/50">
              <IconSeat className="h-4 w-4 text-hero-text-sub" />
            </span>
            <div className="min-w-0">
              <p className="m-0 text-[11px] font-semibold uppercase tracking-wide text-hero-text-sub">좌석 구역</p>
              <p className="m-0 truncate text-[15px] font-semibold text-hero-text">{current.seat}</p>
            </div>
          </div>
          <IconArrowRight aria-hidden className="hidden h-4 w-4 shrink-0 text-hero-text-sub sm:mx-4 sm:block" />
          <IconArrowRight aria-hidden className="h-4 w-4 shrink-0 rotate-90 text-hero-text-sub sm:hidden" />
          <div className="flex flex-1 items-center gap-3 sm:flex-col sm:items-start sm:gap-2">
            <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-accent/50">
              <IconTransit className="h-4 w-4 text-hero-text-sub" />
            </span>
            <div className="min-w-0">
              <p className="m-0 text-[11px] font-semibold uppercase tracking-wide text-hero-text-sub">이동 시간</p>
              <p className="m-0 truncate text-[15px] font-semibold text-hero-text">{current.travel}</p>
            </div>
          </div>
        </div>
        <div className="mt-5 flex justify-center gap-1.5">
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
