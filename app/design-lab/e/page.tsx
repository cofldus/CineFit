import Link from 'next/link';
import { CRITERIA, LAB_MOVIES, SERVICE_STATEMENT, TRUST_LEVELS } from '../_data';
import { Reveal } from '../_Reveal';

// 콘셉트 E — THE SCREENING ROOM. 피드백("영화 극장 스크린 생각나게, CGV 느낌")에 대한 답.
// A(에디토리얼)·B(콜라주)·C(메모)·D(마퀴 사인보드)는 전부 그래픽적/은유적 장치였다. E는
// 은유가 아니라 말 그대로 "어두운 상영관에 앉아 빛나는 스크린을 보는" 장면 하나를 그린다 —
// 실제 멀티플렉스 로비처럼 1관·2관·3관이라는 실존하는 관람 언어를 쓴다. 카드 대신 세 개의
// "상영관 문"이 있고, 각 문 너머로 그 영화의 실제 화면비를 가진 빛이 새어 나온다.
export const metadata = { title: 'Design Lab E — The Screening Room' };

const FONT_STACK = 'var(--lab-font-display), "Pretendard Variable", Pretendard, sans-serif';
const AUD_RAISED = '#181310';
// 시네마 레드 — 작은 글자색으로 다크 배경 위에 직접 쓰면 3.6:1로 AA(4.5:1) 미달이라(직접
// 계산해서 확인) 채워진 배경 위 흰 텍스트(뱃지·버튼)나 큰 헤드라인 강조 단어(3:1 기준)에만
// 쓴다 — 이전 라운드들에서 이미 이 실수를 반복해서 겪었던 것과 같은 종류의 함정이라 처음부터
// 용도를 제한해 둔다.
const RED = '#c81e3d';

function SeatRow() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center gap-1.5 px-4">
      {Array.from({ length: 14 }).map((_, i) => (
        <span key={i} className="h-5 w-6 rounded-t-md bg-black/70 sm:h-7 sm:w-8" />
      ))}
    </div>
  );
}

export default function DesignLabE() {
  return (
    <div className="min-h-screen bg-[#0d0a09] text-[#f2ece4]" style={{ fontFamily: FONT_STACK }}>
      <header className="flex items-center justify-center py-6">
        <Link
          href="/"
          className="text-base font-extrabold tracking-[-0.02em] text-[#f2ece4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
          style={{ outlineColor: RED }}
        >
          CineFit
        </Link>
      </header>

      {/* 히어로 — 문구는 스크린 위가 아니라 객석(어두운 전경)에 둔다. 밝은 스크린 위에
          텍스트를 얹으면 대비를 매번 다시 계산해야 하는 위험(이전 라운드에서 실제로 두 번
          겪음)이 있어, 스크린은 순수한 빛의 오브젝트로만 두고 텍스트는 항상 다크 배경
          위에서만 읽힌다. */}
      <section className="relative overflow-hidden px-5 pb-4 pt-10 text-center sm:px-10">
        <Reveal>
          <p className="break-keep font-wanted text-[9vw] font-extrabold leading-[1.15] tracking-[-0.02em] sm:text-5xl lg:text-6xl">
            이 영화, <span style={{ color: RED }}>어디서</span> 봐야 할까요?
          </p>
          <p className="mx-auto mt-6 max-w-md break-keep text-base leading-[1.7] text-[#f2ece4]/70">
            {SERVICE_STATEMENT}
          </p>
        </Reveal>

        <Reveal delayMs={150}>
          <div className="relative mx-auto mt-12 max-w-3xl">
            {/* 커튼 — 은은한 세로 주름(반복 그러데이션), 화면 양옆을 감싼다 */}
            <div
              aria-hidden
              className="absolute -inset-x-6 inset-y-4 -z-10 opacity-70 sm:-inset-x-10"
              style={{
                background:
                  'repeating-linear-gradient(90deg, #2a1216 0px, #2a1216 14px, #1a0c0e 14px, #1a0c0e 28px)',
              }}
            />
            {/* 스크린 — 실제 빛나는 오브젝트. 텍스트 없음, 순수 대기감 */}
            <div className="relative overflow-hidden" style={{ aspectRatio: '2.2 / 1' }}>
              <div
                className="absolute inset-0"
                style={{ background: 'radial-gradient(ellipse 80% 120% at 50% 30%, #fdf6ec 0%, #d8c9ad 45%, #4a3f2f 80%, #1a1512 100%)' }}
              />
              <div
                aria-hidden
                className="absolute inset-0 opacity-[0.05]"
                style={{
                  backgroundImage: 'repeating-linear-gradient(0deg, black 0px, black 1px, transparent 1px, transparent 3px)',
                }}
              />
            </div>
          </div>

          <div className="relative mt-10 flex justify-center">
            <Link
              href="/movies"
              className="inline-flex min-h-12 items-center justify-center rounded-sm px-8 text-base font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
              style={{ background: RED }}
            >
              지금 비교 시작
            </Link>
          </div>

          <div className="relative mt-14 h-10 sm:h-14">
            <SeatRow />
          </div>
        </Reveal>
      </section>

      {/* 상영관 — 카드 대신 세 개의 "문". 각 문 너머로 그 영화의 실제 화면비를 가진 빛이
          새어 나온다. 넓게 열린 문(듄) · 강하게 쏟아지는 좁은 문(오펜하이머) · 살짝만 열린
          절제된 문(존 오브 인터레스트)으로 서로 다른 개폐 정도를 준다. */}
      <section aria-label="상영관 안내" className="px-5 py-16 sm:px-10 sm:py-24">
        <p className="text-center font-mono text-xs font-semibold tracking-[0.25em] text-[#f2ece4]/55">
          지금 상영 중
        </p>

        <div className="mx-auto mt-10 grid max-w-5xl grid-cols-1 gap-8 sm:grid-cols-3 sm:gap-6">
          {LAB_MOVIES.map((m, i) => {
            const openness = i === 0 ? '86%' : i === 1 ? '60%' : '34%';
            return (
              <Reveal key={m.id} delayMs={i * 100}>
                <Link
                  href="/movies"
                  className="group block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
                  style={{ outlineColor: RED }}
                >
                  <span
                    className="inline-flex min-h-6 items-center rounded-sm px-2 text-[11px] font-bold text-white"
                    style={{ background: RED }}
                  >
                    {i + 1}관
                  </span>
                  <div
                    className="relative mt-3 overflow-hidden rounded-t-3xl transition-[filter] duration-200 group-hover:brightness-110"
                    style={{ aspectRatio: `${m.ratio} / 1.3`, background: AUD_RAISED }}
                  >
                    <div
                      aria-hidden
                      className="absolute inset-x-0 bottom-0 mx-auto"
                      style={{
                        width: openness,
                        height: '100%',
                        background: 'linear-gradient(to top, #fdf6ec, #d8c9ad 55%, transparent 100%)',
                      }}
                    />
                  </div>
                  <div className="mt-3">
                    <h3 className="font-wanted text-lg font-extrabold tracking-[-0.02em] text-[#f2ece4] group-hover:underline sm:text-xl">
                      {m.title}
                    </h3>
                    <p className="mt-1 font-mono text-xs text-[#f2ece4]/65">
                      {m.ratioLabel} · {m.formats.join(' · ')}
                    </p>
                    <p className="mt-1.5 break-keep text-xs text-[#f2ece4]/65">{m.note}</p>
                  </div>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* 판단 기준 + 신뢰도 — 통로 조명처럼 작은 점 하나가 각 항목을 표시한다(D의 크림슨
          눈금과는 다른 장치: 여기서는 "복도의 발밑 조명"이라는 구체적 은유). */}
      <Reveal>
        <section className="border-t border-white/10 px-5 py-16 sm:px-10 sm:py-20">
          <div className="mx-auto grid max-w-4xl grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-4">
            {CRITERIA.map((c) => (
              <div key={c.label} className="flex gap-3 sm:flex-col sm:gap-0">
                <span aria-hidden className="mt-1.5 h-2 w-2 shrink-0 rounded-full sm:mb-3" style={{ background: RED }} />
                <div>
                  <p className="text-sm font-bold text-[#f2ece4]">{c.label}</p>
                  <p className="mt-1 break-keep text-xs text-[#f2ece4]/65">{c.detail}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mx-auto mt-14 flex max-w-3xl flex-wrap items-center justify-center gap-x-8 gap-y-2 text-xs text-[#f2ece4]/65">
            {TRUST_LEVELS.map((t) => (
              <span key={t.label}>{t.label}</span>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Link
              href="/movies"
              className="inline-flex min-h-12 items-center justify-center rounded-sm px-8 text-base font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
              style={{ background: RED }}
            >
              보고 싶은 영화를 선택해 보세요
            </Link>
          </div>
        </section>
      </Reveal>
    </div>
  );
}
