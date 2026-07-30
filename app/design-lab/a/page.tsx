import Link from 'next/link';
import { CRITERIA, LAB_MOVIES, SERVICE_STATEMENT, TRUST_LEVELS } from '../_data';
import { Reveal } from '../_Reveal';

// 콘셉트 A — MOVING IMAGE ARCHIVE. 영상 아카이브·독립영화제 프로그램 북. 카드 없음, 흰 배경
// 검은 타이포, 코발트 블루는 링크·인덱스 숫자에만 아주 제한적으로. 세 영화는 서로 다른
// 내부 그리드를 가진 "편집 지면(entry)"으로 이어진다(§1 절대 조건: 카드 3개 금지 준수).
export const metadata = { title: 'Design Lab A — Moving Image Archive' };

const FONT_STACK = 'var(--lab-font-display), "Pretendard Variable", Pretendard, sans-serif';

export default function DesignLabA() {
  return (
    <div
      className="min-h-screen bg-white text-[#0a0a0a]"
      style={{ fontFamily: FONT_STACK }}
    >
      {/* 마스트헤드 */}
      <header className="flex items-center justify-between border-b border-black/10 px-5 py-4 sm:px-10">
        <span className="text-sm font-extrabold tracking-[-0.02em]">CineFit</span>
        <span className="font-mono text-[11px] tabular-nums tracking-[0.08em] text-black/65">
          ARCHIVE · ED. 02 · {LAB_MOVIES.length}작품 수록
        </span>
      </header>

      {/* 히어로 — 좌우 대칭 배치 없음. 문장이 가장자리까지 확장되고, 단어가 분리된다. */}
      <section className="border-b border-black/10 px-5 pb-10 pt-14 sm:px-10 sm:pb-16 sm:pt-20">
        <Reveal>
          <p className="break-keep text-[15vw] font-extrabold leading-[0.92] tracking-[-0.045em] sm:text-[9vw] lg:text-[7.5vw]">
            이 영화,
          </p>
          {/* justify-between으로 단어를 가장자리까지 펼치는 효과는 768px 이상에서만 의도대로
              보인다 — 390px에서는 같은 줄에 세 단어가 다 안 들어가 flex-wrap이 단어 사이에
              보기 흉한 빈 공백만 남겼다(실제 캡처로 확인한 버그). 모바일에서는 그냥 세로로
              쌓는다. */}
          <div className="mt-1 flex flex-col items-start gap-x-4 break-keep text-[13vw] font-extrabold leading-[0.92] tracking-[-0.045em] sm:flex-row sm:flex-wrap sm:items-baseline sm:justify-between sm:text-[8vw] lg:text-[6.8vw]">
            <span>어디서</span>
            <span>봐야</span>
            <span className="text-[#1d4fd6]">할까요?</span>
          </div>
        </Reveal>

        <Reveal delayMs={120}>
          <div className="mt-10 flex flex-col gap-6 sm:mt-14 sm:flex-row sm:items-end sm:justify-between">
            <p className="max-w-md break-keep text-sm leading-[1.7] text-black/60 sm:text-base">
              {SERVICE_STATEMENT}
            </p>
            <Link
              href="/movies"
              className="inline-flex min-h-11 items-center gap-2 border-b-2 border-[#1d4fd6] pb-1 text-sm font-bold text-[#1d4fd6] transition-[gap] duration-200 hover:gap-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1d4fd6]"
            >
              지금 비교 시작
              <span aria-hidden>→</span>
            </Link>
          </div>
        </Reveal>
      </section>

      {/* 영화 영역 — 카드 아님. 세로 인덱스 + 서로 다른 내부 레이아웃을 가진 3개의 편집 지면 */}
      <section aria-label="지금 볼 수 있는 영화" className="flex px-5 sm:px-10">
        <div
          aria-hidden
          className="mr-4 hidden shrink-0 pt-2 font-mono text-[10px] tracking-[0.2em] text-black/65 sm:mr-8 sm:block"
          style={{ writingMode: 'vertical-rl' }}
        >
          SCREENING INDEX
        </div>

        <ol className="m-0 w-full list-none divide-y divide-black/10 p-0">
          {/* 01 — 제목 좌측 대형, 우측 타임코드형 스펙 */}
          <li>
            <Reveal>
              <Link
                href="/movies"
                className="group grid grid-cols-1 gap-4 py-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1d4fd6] sm:grid-cols-12 sm:gap-6 sm:py-14"
              >
                <span className="font-mono text-xs text-black/65 sm:col-span-1">01</span>
                <h3 className="break-keep text-[10vw] font-extrabold leading-[0.95] tracking-[-0.03em] transition-colors group-hover:text-[#1d4fd6] sm:col-span-7 sm:text-[4.2vw] lg:text-[3.4vw]">
                  {LAB_MOVIES[0].title}
                </h3>
                <div className="flex flex-col items-start gap-1 font-mono text-sm tabular-nums text-black/60 sm:col-span-4 sm:items-end sm:text-right">
                  <span className="text-lg font-bold text-black">{LAB_MOVIES[0].ratioLabel}</span>
                  <span>{LAB_MOVIES[0].formats.join(' · ')}</span>
                  <span className="mt-2 max-w-[26ch] break-keep text-xs text-black/65 sm:text-right">
                    {LAB_MOVIES[0].note}
                  </span>
                </div>
              </Link>
            </Reveal>
          </li>

          {/* 02 — 좌측에 인덱스+스펙, 우측 대형 제목(01과 좌우 반전) */}
          <li>
            <Reveal>
              <Link
                href="/movies"
                className="group grid grid-cols-1 gap-4 py-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1d4fd6] sm:grid-cols-12 sm:gap-6 sm:py-14"
              >
                <div className="flex flex-row items-baseline gap-3 font-mono text-sm tabular-nums text-black/60 sm:col-span-4 sm:flex-col sm:items-start sm:gap-1">
                  <span className="text-xs text-black/65">02</span>
                  <span className="text-lg font-bold text-black">{LAB_MOVIES[1].ratioLabel}</span>
                  <span>{LAB_MOVIES[1].formats.join(' · ')}</span>
                </div>
                <div className="sm:col-span-8">
                  <h3 className="break-keep text-[10vw] font-extrabold leading-[0.95] tracking-[-0.03em] transition-colors group-hover:text-[#1d4fd6] sm:text-[4.2vw] lg:text-[3.4vw]">
                    {LAB_MOVIES[1].title}
                  </h3>
                  <p className="mt-2 max-w-[48ch] break-keep text-sm text-black/65">{LAB_MOVIES[1].note}</p>
                </div>
              </Link>
            </Reveal>
          </li>

          {/* 03 — 제목 상단 전체 폭, 하단에 화면비 막대 시각화(01·02와 다른 그래픽 장치) */}
          <li>
            <Reveal>
              <Link
                href="/movies"
                className="group block py-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1d4fd6] sm:py-14"
              >
                <div className="flex items-baseline justify-between">
                  <h3 className="break-keep text-[10vw] font-extrabold leading-[0.95] tracking-[-0.03em] transition-colors group-hover:text-[#1d4fd6] sm:text-[4.2vw] lg:text-[3.4vw]">
                    {LAB_MOVIES[2].title}
                  </h3>
                  <span className="font-mono text-xs text-black/65">03</span>
                </div>
                <div className="mt-5 flex items-center gap-4">
                  <div className="h-1.5 flex-1 bg-black/10">
                    <div
                      className="h-full bg-[#1d4fd6]"
                      style={{ width: `${(LAB_MOVIES[2].ratio / 2.39) * 100}%` }}
                    />
                  </div>
                  <span className="shrink-0 font-mono text-lg font-bold tabular-nums text-black">
                    {LAB_MOVIES[2].ratioLabel}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-mono text-sm text-black/60">{LAB_MOVIES[2].formats.join(' · ')}</span>
                  <p className="max-w-[40ch] break-keep text-sm text-black/65">{LAB_MOVIES[2].note}</p>
                </div>
              </Link>
            </Reveal>
          </li>
        </ol>
      </section>

      {/* 판단 기준 + 신뢰도 — 카탈로그 색인처럼, 큰 장식 숫자 없이 */}
      <Reveal>
        <section className="grid grid-cols-1 gap-10 border-t border-black/10 px-5 py-14 sm:grid-cols-2 sm:px-10">
          <div>
            <h2 className="font-mono text-xs tracking-[0.15em] text-black/65">판단 기준</h2>
            <ol className="m-0 mt-4 list-none space-y-3 p-0">
              {CRITERIA.map((c, i) => (
                <li key={c.label} className="flex gap-3 text-sm">
                  <span className="font-mono tabular-nums text-black/65">{String(i + 1).padStart(2, '0')}</span>
                  <span>
                    <span className="font-bold">{c.label}</span>
                    <span className="text-black/65"> — {c.detail}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
          <div className="border-t border-black/10 pt-6 sm:border-l sm:border-t-0 sm:pl-10 sm:pt-0">
            <h2 className="font-mono text-xs tracking-[0.15em] text-black/65">정보 신뢰도</h2>
            <ul className="m-0 mt-4 list-none space-y-3 p-0">
              {TRUST_LEVELS.map((t) => (
                <li key={t.label} className="text-sm">
                  <span className="font-bold">{t.label}</span>
                  <span className="text-black/65"> — {t.detail}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </Reveal>

      <footer className="flex items-center justify-between border-t border-black/10 px-5 py-8 sm:px-10">
        <span className="font-mono text-[11px] text-black/65">CineFit — Moving Image Archive</span>
        <Link
          href="/movies"
          className="inline-flex min-h-11 items-center gap-2 border-b-2 border-[#1d4fd6] pb-1 text-sm font-bold text-[#1d4fd6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1d4fd6]"
        >
          지금 비교 시작 <span aria-hidden>→</span>
        </Link>
      </footer>
    </div>
  );
}
