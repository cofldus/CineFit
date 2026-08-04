'use client';

import Link from 'next/link';
import { useState } from 'react';
import { IconArrowRight } from './Icon';

// 실제 특정 상영관을 가리키지 않는, "CineFit이 무엇을 비교하는지" 보여주는 예시 값들 —
// 화면비·포맷·좌석·이동시간은 전부 실제 서비스가 다루는 항목이고 숫자는 대표값일 뿐,
// 특정 영화·상영관·회차를 지어낸 것이 아니다. frameRatio는 그 포맷의 스크린 프레임
// 비율(IMAX 디지털 확장 1.90:1, 돌비 2.20:1, 일반관 마스킹 벽 2.39:1) — 탭을 바꾸면
// 프레임의 실제 높이가 morph하고(§3), ratio(켜지는 화면)와의 차이는 마스킹으로 남는다.
const STAGE_FRAMES = [
  {
    ratio: 1.9,
    frameRatio: 1.9,
    format: 'IMAX',
    // 1.90:1은 IMAX "디지털" 기준 예시 — GT(레이저) 상영관은 1.43:1까지 확장된다.
    // 모든 IMAX를 대표하는 값처럼 보이지 않게 화면에 예시 맥락을 함께 표기한다(R20 §8).
    example: 'IMAX 디지털 예시',
    seat: '중앙 블록',
    travel: '24분',
    desc: 'IMAX 디지털(1.90:1) 예시 — 상영관에 따라 1.43:1까지 확장돼요',
    seatHighlight: { rows: [2, 3], cols: [4, 7] },
  },
  {
    ratio: 2.2,
    frameRatio: 2.2,
    format: '돌비시네마',
    example: null,
    seat: '뒤쪽 중앙',
    travel: '18분',
    desc: '돌비 비전·애트모스 — 명암과 입체 음향 중심',
    seatHighlight: { rows: [3, 4], cols: [4, 7] },
  },
  {
    ratio: 1.85,
    frameRatio: 2.39,
    format: '일반관',
    example: null,
    seat: '가운데 열',
    travel: '12분',
    desc: '1.85:1 상영 — 좌우 마스킹이 남습니다',
    seatHighlight: { rows: [2, 2], cols: [3, 8] },
  },
] as const;

const SEAT_ROWS = 5;
const SEAT_COLS = 12;

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
  // R15 §3: 자동 순환 제거 — 사용자가 탭을 누를 때만 반응한다(자동 반복 애니메이션 금지).
  const [frame, setFrame] = useState(0);

  const current = STAGE_FRAMES[frame];
  const isImax = current.format === 'IMAX';
  const isDolby = current.format === '돌비시네마';
  const { rows: hlRows, cols: hlCols } = current.seatHighlight;

  return (
    <section className="enter-1 relative overflow-hidden px-5 pb-12 pt-10 sm:px-10 sm:pt-16 lg:pb-16">
      {/* 공간을 채우는 아주 약한 조명층 — 휑한 배경 방지, 네온이 아니라 극장 간접광. */}
      <div aria-hidden className="pointer-events-none absolute -left-44 top-8 h-[440px] w-[440px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(135, 43, 66, 0.13), transparent 65%)' }} />
      <div aria-hidden className="pointer-events-none absolute -right-32 top-1/3 h-[400px] w-[400px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(188, 96, 118, 0.09), transparent 65%)' }} />
      <div className="mx-auto grid max-w-wide items-center gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-14">
        {/* 좌: 헤드라인·설명·CTA */}
        <div>
          {/* R14 §3: 세 줄 시작점 정렬, '어디서 봐야'만 로즈 단색 + 10% 크게. 그라데이션·
              가로압축·기울임 금지. 헤드라인이 화면을 지배하지 않는 절제된 크기. */}
          <h1 className="m-0 flex flex-col gap-1 break-keep">
            <span
              className="hero-word type-display block text-[9vw] sm:text-[44px]"
              style={{ animationDelay: '0ms' }}
            >
              이 영화,
            </span>{' '}
            <span
              className="hero-word type-display block text-[10vw] text-primary sm:text-[49px]"
              style={{ animationDelay: '120ms' }}
            >
              어디서 봐야
            </span>{' '}
            <span
              className="hero-word type-display block text-[9vw] sm:text-[44px]"
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
              className="group inline-flex min-h-12 items-center justify-center gap-1.5 rounded-card bg-primary-strong px-8 text-base font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-primary-strong-hover hover:shadow-glow-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary active:scale-[0.98]"
            >
              영화 선택하기
              <IconArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>

        {/* 우: 스크린 시뮬레이터 — 하나의 중심(스크린). 카드 테두리 없이 표면과 간접광만. */}
        <div className="group relative overflow-hidden rounded-card-xl bg-hero px-5 py-7 shadow-glow-primary sm:px-8 sm:py-9">
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
                  onClick={() => setFrame(i)}
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

          <div className="relative mt-8 flex flex-col items-center">
            {/* 스크린 프레임(R15 §3) — 탭을 바꾸면 프레임의 실제 비율·높이가 morph한다
                (IMAX 1.90:1은 눈에 띄게 높아진다). 프레임보다 좁은 화면비는 좌우 마스킹으로
                남아 비율 차이가 즉각 체감된다. 높이 전환은 padding-top(애니메이션 가능)으로. */}
            <div className="relative w-full max-w-[560px]">
              {isDolby ? (
                <>
                  <span aria-hidden className="dolby-pulse pointer-events-none absolute inset-0 rounded-[10px] border border-primary/30" />
                  <span
                    aria-hidden
                    className="dolby-pulse pointer-events-none absolute inset-0 rounded-[10px] border border-primary/30"
                    style={{ animationDelay: '700ms' }}
                  />
                </>
              ) : null}
              <div
                className="relative w-full overflow-hidden rounded-[10px] border border-white/10 bg-[#0d0b0c] transition-[padding-top,box-shadow] duration-[550ms] ease-out"
                style={{
                  paddingTop: `${(1 / current.frameRatio) * 100}%`,
                  boxShadow: isImax
                    ? '0 0 0 1px rgba(201, 111, 132, 0.35), 0 22px 70px -22px rgba(135, 43, 66, 0.6)'
                    : '0 22px 70px -22px rgba(135, 43, 66, 0.45)',
                }}
              >
                <div className="absolute inset-0 flex items-center justify-center">
                {/* 켜진 화면 — 실제 화면비만큼만 점등. 활성 모듈에 마우스가 올라가면 내부광이
                    7%만 밝아진다(자동 반복 발광 없음). */}
                <div
                  className="relative flex h-full items-center justify-center overflow-hidden transition-[width,filter] duration-[550ms] ease-out group-hover:brightness-[1.07]"
                  style={{
                    width: `${(current.ratio / current.frameRatio) * 100}%`,
                    background:
                      'linear-gradient(180deg, rgba(135, 43, 66, 0.48) 0%, rgba(64, 42, 49, 0.95) 55%, rgba(38, 28, 31, 0.98) 100%)',
                  }}
                >
                  <span
                    aria-hidden
                    className="absolute inset-x-3 top-0 h-px"
                    style={{ background: 'linear-gradient(90deg, transparent, rgba(201, 111, 132, 0.85), transparent)' }}
                  />
                  <span className="flex flex-col items-center gap-1.5">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-hero-text-sub">
                      {current.format}
                    </span>
                    <span className="whitespace-nowrap text-[21px] font-light tracking-[0.16em] tabular-nums text-hero-text sm:text-[25px]">
                      {current.ratio.toFixed(2)}:1
                    </span>
                    {current.example ? (
                      <span className="whitespace-nowrap text-[10px] font-medium text-hero-text-sub">
                        {current.example}
                      </span>
                    ) : null}
                  </span>
                  <span
                    aria-hidden
                    className="absolute inset-x-6 bottom-0 h-px"
                    style={{ background: 'linear-gradient(90deg, transparent, rgba(201, 111, 132, 0.45), transparent)' }}
                  />
                </div>
                {isImax ? (
                  <span className="absolute right-2.5 top-2 rounded-full border border-primary px-2 py-px text-[10px] font-bold uppercase tracking-wide text-primary">
                    확장
                  </span>
                ) : null}
                </div>
              </div>
              {/* 스크린 불빛이 객석으로 번지는 간접광. */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-[-8%] top-full h-20 opacity-50"
                style={{ background: 'radial-gradient(ellipse 60% 90% at 50% 0%, rgba(93, 24, 40, 0.5), transparent 70%)' }}
              />
            </div>

            {/* 객석(R15 §3) — 포맷을 바꿀 때마다 추천 블록이 중앙부터 순차 점등 "1회"만
                실행된다(무한 호흡 애니메이션 제거 — 자동 반복 금지). key={frame}로 포맷
                전환 시에만 재점등. */}
            <div key={frame} aria-hidden className="mt-8 flex w-full flex-col items-center gap-[5px]">
              {Array.from({ length: SEAT_ROWS }, (_, r) => (
                <div
                  key={r}
                  className="flex justify-center gap-[5px]"
                  style={{ width: `${58 + r * 5}%`, maxWidth: '420px' }}
                >
                  {Array.from({ length: SEAT_COLS }, (_, c) => {
                    const highlighted = r >= hlRows[0] && r <= hlRows[1] && c >= hlCols[0] && c <= hlCols[1];
                    const rc = (hlRows[0] + hlRows[1]) / 2;
                    const cc = (hlCols[0] + hlCols[1]) / 2;
                    const dist = Math.sqrt((r - rc) ** 2 + ((c - cc) / 2) ** 2);
                    return (
                      <span
                        key={c}
                        className={`h-[7px] flex-1 rounded-[2px] ${
                          highlighted ? 'seat-light bg-gradient-to-b from-primary/80 to-primary-strong' : 'bg-hero-soft/70'
                        }`}
                        style={highlighted ? { animationDelay: `${Math.round(dist * 55)}ms` } : undefined}
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
            <p key={frame} className="stage-enter m-0 ml-auto hidden max-w-[240px] text-right text-[12.5px] leading-relaxed text-hero-text-sub sm:block">
              {current.desc}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
