import Link from 'next/link';
import { CRITERIA, DEMO_RESULT, LAB_MOVIES, SERVICE_STATEMENT, TRUST_LEVELS } from '../_data';
import { Reveal } from '../_Reveal';

// 콘셉트 B — CINEMATIC COLLAGE. 하나의 연속된 다크 캔버스(§1 절대 조건: dark→light 반복
// 금지) 위에 타이포·데이터·스크린 빛이 레이어로 겹친다. 카드 없음, 좌우 분리 히어로 없음.
export const metadata = { title: 'Design Lab B — Cinematic Collage' };

const FONT_STACK = 'var(--lab-font-display), "Pretendard Variable", Pretendard, sans-serif';
const ELECTRIC = '#3d6bff';
// 채워진 배경 위에 흰 텍스트를 얹는 CTA 버튼 전용 — ELECTRIC 그대로 쓰면 흰 텍스트 대비가
// 4.42:1로 WCAG AA(4.5:1)에 살짝 못 미친다(axe가 실제로 잡아냄). 이 프로젝트가 이미 같은
// 목적으로 검증해 둔 값(app/globals.css의 --primary-strong)을 그대로 재사용한다.
const ELECTRIC_FILL = '#2f6fe0';

export default function DesignLabB() {
  return (
    <div className="min-h-screen bg-[#050507] text-[#efeee8]" style={{ fontFamily: FONT_STACK }}>
      {/* 투명 상단 바 — 별도 박스 배경 없이 캔버스 위에 얹힌다 */}
      <div className="relative z-20 flex items-center justify-between px-5 py-5 sm:px-10">
        <span className="text-sm font-extrabold tracking-[-0.02em]">CineFit</span>
        <Link
          href="/movies"
          className="inline-flex min-h-11 items-center rounded-full border border-white/20 px-4 text-xs font-semibold tracking-[0.04em] text-white/80 transition-colors hover:border-white/40 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3d6bff]"
        >
          영화 선택
        </Link>
      </div>

      {/* 히어로 콜라주 — 제목·CTA·추천 결과·화면비 데이터가 하나의 조형물처럼 겹친다.
          처음에는 min-h-[92vh]로 몰입감을 주려 했지만, 실제 콘텐츠 높이가 그보다 훨씬 짧아
          아래쪽 절반이 아무것도 없는 빈 암전 구간으로 캡처됐다(스크린샷에서 실제로 확인) —
          "여백"이 아니라 "버그처럼 보이는 빈 공간"이었다. 콘텐츠 높이에 맞춰 자연스럽게
          여백을 준다. */}
      <section className="relative overflow-hidden px-5 pb-24 pt-6 sm:px-10 sm:pb-32">
        {/* 스크린 빛 — 화면을 가로지르는 사선 광선. 장식용 빈 사각형이 아니라 타이포와 실제로 겹치는 광원 */}
        <div
          aria-hidden
          className="pointer-events-none absolute -left-1/4 top-[18%] h-[55%] w-[150%] -rotate-[7deg]"
          style={{ background: `linear-gradient(90deg, transparent 0%, rgba(61,107,255,0.22) 35%, rgba(61,107,255,0.32) 50%, rgba(61,107,255,0.22) 65%, transparent 100%)` }}
        />

        <Reveal className="relative">
          <p className="break-keep text-[16vw] font-extrabold leading-[0.9] tracking-[-0.05em] sm:text-[9vw] lg:text-[7vw]">
            이 영화,
          </p>
        </Reveal>

        <Reveal delayMs={100} className="relative mt-2 pl-[8vw] sm:pl-[18vw] lg:pl-[26vw]">
          <p className="break-keep text-[13vw] font-extrabold leading-[0.9] tracking-[-0.05em] text-white/90 sm:text-[7.5vw] lg:text-[5.6vw]">
            어디서 봐야
            <br />
            <span style={{ color: ELECTRIC }}>할까요?</span>
          </p>
        </Reveal>

        {/* 추천 결과 파편 — 테두리 카드 아님. 얇은 반투명 판 하나에 텍스트만 */}
        <Reveal delayMs={220} className="relative mt-10 max-w-sm sm:ml-[10vw] sm:mt-14 lg:ml-[30vw]">
          <div
            className="rounded-none px-5 py-4 backdrop-blur-sm"
            style={{ background: 'linear-gradient(120deg, rgba(61,107,255,0.16), rgba(255,255,255,0.03))' }}
          >
            <div className="flex items-center justify-between font-mono text-[11px] tracking-[0.08em] text-white/50">
              <span>PREVIEW</span>
              <span className="font-bold" style={{ color: ELECTRIC }}>
                일치도 {DEMO_RESULT.matchPercent}%
              </span>
            </div>
            <p className="mt-2 text-lg font-bold tracking-[-0.02em] text-white">{DEMO_RESULT.cinema}</p>
            <p className="mt-1 font-mono text-xs text-white/50">
              {DEMO_RESULT.format} · 이동 {DEMO_RESULT.distanceMin}분 · {DEMO_RESULT.price.toLocaleString()}원
            </p>
          </div>
        </Reveal>

        <div className="relative mt-14 flex flex-col gap-6 sm:mt-20 sm:flex-row sm:items-end sm:justify-between">
          <p className="max-w-xs break-keep text-xs leading-[1.7] text-white/60">{SERVICE_STATEMENT}</p>
          <Link
            href="/movies"
            className="group inline-flex min-h-12 w-fit items-center gap-2 rounded-full px-6 text-sm font-semibold text-white transition-[gap] duration-200 hover:gap-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:self-end"
            style={{ background: ELECTRIC_FILL }}
          >
            지금 비교 시작
            <span aria-hidden className="transition-transform duration-200 group-hover:translate-x-0.5">
              →
            </span>
          </Link>
        </div>
      </section>

      {/* 영화 패널 클러스터 — 세 작품이 실제 화면비로 서로 다른 모양을 이루는 콜라주 */}
      <section aria-label="지금 볼 수 있는 영화" className="relative px-5 pb-28 pt-6 sm:px-10">
        {/* 듄: 파트 2 — 2.39:1, 가로로 긴 레터박스 스트립 */}
        <Reveal>
          <Link
            href="/movies"
            className="group relative block w-full overflow-hidden bg-white/[0.04] transition-[background-color] hover:bg-white/[0.07] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3d6bff]"
            style={{ aspectRatio: '2.39 / 1' }}
          >
            <div
              aria-hidden
              className="absolute inset-0"
              style={{ background: 'radial-gradient(ellipse 70% 100% at 22% 50%, rgba(61,107,255,0.5), transparent 75%)' }}
            />
            {/* 2.39 고스트 숫자 — 넓은 레터박스 스트립이 "빈 암전 상자"로 읽히지 않도록 실제
                화면비 데이터 자체를 큰 그래픽으로 채운다(장식이 아니라 실데이터) */}
            <span
              aria-hidden
              className="absolute -bottom-4 right-6 font-mono text-[18vw] font-extrabold leading-none text-white/[0.07] sm:text-[9vw]"
            >
              2.39
            </span>
            <div className="absolute inset-y-0 left-4 flex flex-col justify-center sm:left-6">
              <p className="text-2xl font-extrabold tracking-[-0.02em] text-white sm:text-4xl">
                {LAB_MOVIES[0].title}
              </p>
              <p className="mt-1 font-mono text-xs text-white/60 sm:text-sm">
                {LAB_MOVIES[0].ratioLabel} · {LAB_MOVIES[0].formats.join(' · ')}
              </p>
            </div>
          </Link>
        </Reveal>

        {/* 오펜하이머 — 중앙에 강한 빛 폭발, 듄 스트립 아래쪽과 겹치도록 음수 마진 */}
        <Reveal delayMs={120}>
          <Link
            href="/movies"
            className="group relative z-10 mx-auto -mt-8 block w-[78%] overflow-hidden bg-black shadow-[0_30px_80px_rgba(0,0,0,0.6)] transition-transform duration-200 hover:-translate-y-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3d6bff] sm:w-3/5 lg:w-2/5"
            style={{ aspectRatio: '2.2 / 1' }}
          >
            <div
              aria-hidden
              className="absolute inset-0"
              style={{ background: 'radial-gradient(circle at 50% 45%, rgba(255,255,255,0.9), rgba(61,107,255,0.5) 35%, transparent 72%)' }}
            />
            {/* 하단 스크림 — 강한 흰 빛 위에 텍스트를 얹어야 해서 mix-blend 대신 확실한
                어두운 그러데이션을 깔고 흰 텍스트를 쓴다(검증된 대비 확보 방식) */}
            <div
              aria-hidden
              className="absolute inset-x-0 bottom-0 h-2/3"
              style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent 100%)' }}
            />
            <div className="absolute inset-x-0 bottom-4 text-center sm:bottom-6">
              <p className="text-xl font-extrabold tracking-[-0.02em] text-white sm:text-2xl">
                {LAB_MOVIES[1].title}
              </p>
              <p className="mt-1 font-mono text-[11px] text-white/70">
                {LAB_MOVIES[1].ratioLabel} · {LAB_MOVIES[1].formats.join(' · ')}
              </p>
            </div>
          </Link>
        </Reveal>

        {/* 존 오브 인터레스트 — 1.85:1 프레임을 좁게 크롭한 세로 조각 */}
        <Reveal delayMs={220}>
          <Link
            href="/movies"
            className="group relative z-20 ml-auto -mt-10 flex h-64 w-[30%] items-end overflow-hidden bg-white/[0.04] transition-[background-color] hover:bg-white/[0.07] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3d6bff] sm:h-80 sm:w-[22%]"
          >
            <div
              aria-hidden
              className="absolute left-1/2 top-1/2 w-[340%] -translate-x-1/2 -translate-y-1/2 bg-white/[0.06]"
              style={{ aspectRatio: '1.85 / 1' }}
            />
            <div className="relative w-full p-3 sm:p-4">
              <p className="break-keep text-base font-extrabold leading-tight tracking-[-0.02em] text-white sm:text-lg">
                {LAB_MOVIES[2].title}
              </p>
              <p className="mt-1 font-mono text-[10px] text-white/55">{LAB_MOVIES[2].ratioLabel}</p>
            </div>
          </Link>
        </Reveal>
      </section>

      {/* 마무리 — 새 배경색 섹션이 아니라 같은 캔버스를 가로지르는 얇은 선을 따라 태그가 떠 있다 */}
      <Reveal>
        <section className="relative border-t border-white/10 px-5 py-16 sm:px-10">
          <div className="flex flex-wrap gap-x-10 gap-y-6">
            {CRITERIA.map((c) => (
              <div key={c.label} className="max-w-[22ch]">
                <p className="text-sm font-bold text-white">{c.label}</p>
                <p className="mt-1 break-keep text-xs text-white/60">{c.detail}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[11px] text-white/60">
            {TRUST_LEVELS.map((t) => (
              <span key={t.label}>{t.label}</span>
            ))}
          </div>

          <Link
            href="/movies"
            className="group mt-10 inline-flex min-h-12 items-center gap-2 rounded-full px-6 text-sm font-semibold text-white transition-[gap] duration-200 hover:gap-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            style={{ background: ELECTRIC_FILL }}
          >
            지금 비교 시작
            <span aria-hidden className="transition-transform duration-200 group-hover:translate-x-0.5">
              →
            </span>
          </Link>
        </section>
      </Reveal>
    </div>
  );
}
