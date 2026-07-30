import Link from 'next/link';
import { CRITERIA, LAB_MOVIES, SERVICE_STATEMENT, TRUST_LEVELS } from '../_data';
import { Reveal } from '../_Reveal';

// 콘셉트 D — GRAND FOYER. 사용자 피드백("A/B/C 다 별론데... 더 세련되고 단단한 멋쟁이 극장
// 느낌으로, 깔끔하고 현대적이면서 크림슨 포인트, 따뜻하되 아늑하고 널찍한 느낌")을 반영한
// 4번째 시안. A(비대칭 에디토리얼)·B(비대칭 콜라주)·C(텍스트-인터페이스 메모)와 달리
// 이번엔 좌우 대칭 구조를 쓴다 — "단단함"은 비대칭적 긴장이 아니라 중심 잡힌 균형에서, "극장"
// 느낌은 마퀴(극장 간판) 사인보드 은유에서 온다. 카드 3개 대신 하나의 사인보드 안에 세 줄을
// 담고, 다크→라이트→다크로 정확히 한 번씩만 전환해(반복 아님) "아늑하되 널찍한" 공간감을
// 낸다.
export const metadata = { title: 'Design Lab D — Grand Foyer' };

const FONT_STACK = 'var(--lab-font-display), "Pretendard Variable", Pretendard, sans-serif';
// 크림슨 하나만 — 흰 텍스트를 얹는 채워진 배경(버튼)과 밝은 종이색 배경 위 텍스트 양쪽에서
// 모두 4.5:1을 넘도록 직접 계산해서 고른 값(각각 8.0:1, 6.7:1).
const CRIMSON = '#9c1a35';

function DividerTick() {
  return <span aria-hidden className="mx-auto block h-1 w-6" style={{ background: CRIMSON }} />;
}

export default function DesignLabD() {
  return (
    <div className="min-h-screen bg-[#1c1613] text-[#f3ead9]" style={{ fontFamily: FONT_STACK }}>
      {/* 마스트헤드 — A/B/C는 전부 좌우로 나뉜 헤더였다. D는 극장 로비 안내판처럼 중앙 정렬. */}
      <header className="flex flex-col items-center gap-2 pb-2 pt-10">
        <Link
          href="/"
          className="text-lg font-extrabold tracking-[-0.02em] text-[#f3ead9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
          style={{ outlineColor: CRIMSON }}
          aria-label="CineFit"
        >
          CineFit
        </Link>
        <span aria-hidden className="h-px w-10" style={{ background: CRIMSON }} />
      </header>

      {/* 히어로 — 마퀴 사인보드의 크림슨 이중 룰로 감싼 중앙 정렬 문장. 좌우 분리도, 장식
          그래픽도 없다. 여백을 넉넉히 써서 "널찍함"을, 룰과 두꺼운 굵기로 "단단함"을 낸다. */}
      <section className="mx-auto max-w-2xl px-6 py-16 text-center sm:py-24">
        <Reveal>
          <div className="border-y-2 py-10 sm:py-14" style={{ borderColor: CRIMSON }}>
            <p className="break-keep font-wanted text-[9vw] font-extrabold leading-[1.15] tracking-[-0.02em] sm:text-5xl lg:text-[3.4rem]">
              이 영화,
              <br />
              어디서 봐야 할까요?
            </p>
          </div>
        </Reveal>

        <Reveal delayMs={150}>
          <p className="mx-auto mt-10 max-w-md break-keep text-base leading-[1.75] text-[#f3ead9]/70">
            {SERVICE_STATEMENT}
          </p>
          <Link
            href="/movies"
            className="mt-9 inline-flex min-h-12 items-center justify-center px-9 text-base font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f3ead9]"
            style={{ background: CRIMSON }}
          >
            지금 비교 시작
          </Link>
        </Reveal>
      </section>

      {/* 영화 사인보드 — 카드 3개가 아니라 하나의 보드 안에 세 줄. 첫 줄만 크게 둬 위계를
          주되, 셋 다 같은 프레임 하나에 속해 "카드 반복"으로 보이지 않는다. 이 섹션만 밝은
          웜톤 배경 — 다크→라이트→다크 정확히 한 번(반복 아님)으로 "환한 로비" 대비를 낸다. */}
      <section aria-label="지금 볼 수 있는 영화" className="bg-[#f3ead9] py-20 text-[#1c1613] sm:py-28">
        <div className="mx-auto max-w-3xl px-6">
          <p className="text-center font-mono text-xs font-semibold tracking-[0.25em]" style={{ color: CRIMSON }}>
            NOW SHOWING
          </p>

          <Reveal delayMs={80}>
            <div className="mt-8 border" style={{ borderColor: `${CRIMSON}55` }}>
              {LAB_MOVIES.map((m, i) => (
                <Link
                  key={m.id}
                  href="/movies"
                  className={`group flex items-center justify-between gap-6 px-6 text-[#1c1613] transition-colors hover:bg-[#1c1613]/[0.03] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 sm:px-10 ${
                    i < LAB_MOVIES.length - 1 ? 'border-b' : ''
                  } ${i === 0 ? 'py-8' : 'py-6'}`}
                  style={{ borderColor: 'rgba(28,22,19,0.12)', outlineColor: CRIMSON }}
                >
                  <span
                    className={`font-wanted font-extrabold tracking-[-0.02em] group-hover:underline ${
                      i === 0 ? 'text-3xl sm:text-4xl' : 'text-xl sm:text-2xl'
                    }`}
                  >
                    {m.title}
                  </span>
                  <span className="shrink-0 text-right font-mono text-xs text-[#1c1613]/70 sm:text-sm">
                    <span className="block">{m.ratioLabel}</span>
                    <span className="block">{m.formats.join(' · ')}</span>
                  </span>
                </Link>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* 판단 기준 + 신뢰도 — 다시 다크로. 중앙 정렬 4열, 카드 아님, 크림슨 짧은 눈금이
          구분자. 마지막 CTA로 히어로의 중앙 정렬·크림슨 버튼 리듬을 다시 받는다(bookend). */}
      <Reveal>
        <section className="px-6 py-20 sm:py-28">
          <div className="mx-auto grid max-w-4xl grid-cols-1 gap-y-12 text-center sm:grid-cols-4 sm:gap-x-8">
            {CRITERIA.map((c) => (
              <div key={c.label}>
                <DividerTick />
                <p className="mt-5 text-sm font-bold">{c.label}</p>
                <p className="mt-1.5 break-keep text-xs text-[#f3ead9]/55">{c.detail}</p>
              </div>
            ))}
          </div>

          <div className="mx-auto mt-16 flex max-w-3xl flex-wrap items-center justify-center gap-x-8 gap-y-2 text-xs text-[#f3ead9]/55">
            {TRUST_LEVELS.map((t) => (
              <span key={t.label}>{t.label}</span>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Link
              href="/movies"
              className="inline-flex min-h-12 items-center justify-center px-9 text-base font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f3ead9]"
              style={{ background: CRIMSON }}
            >
              보고 싶은 영화를 선택해 보세요
            </Link>
          </div>
        </section>
      </Reveal>
    </div>
  );
}
