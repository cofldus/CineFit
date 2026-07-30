import { Lora } from 'next/font/google';
import Link from 'next/link';
import { CRITERIA, LAB_MOVIES, SERVICE_STATEMENT, TRUST_LEVELS } from '../_data';
import { Reveal } from '../_Reveal';

// 콘셉트 C — CURATOR'S DESK. 히어로 비주얼 오브젝트 자체가 없다("텍스트가 곧 인터페이스").
// 카드 없음 — 큐레이터의 선정 메모, 편집 주석, 밑줄로 구성한다. 코발트 블루 대신 적색 포인트
// 하나(§3 "블루 또는 적색 포인트 하나"). 작은 영문 레이블에만 오픈 라이선스 세리프(Lora)를
// 별도로 써서 A(모노스페이스)·B(산세리프 단독)와 확실히 다른 인쇄물 질감을 준다.
const lora = Lora({ subsets: ['latin'], weight: ['500', '600'] });

export const metadata = { title: "Design Lab C — Curator's Desk" };

const FONT_STACK = 'var(--lab-font-display), "Pretendard Variable", Pretendard, sans-serif';
const RED = '#b5402a';

function CheckMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden fill="none" stroke={RED} strokeWidth="1.75">
      <path d="M3 8.5 6.5 12 13 4" />
    </svg>
  );
}

export default function DesignLabC() {
  return (
    <div className="min-h-screen bg-[#f6f1e6] text-[#1c1712]" style={{ fontFamily: FONT_STACK }}>
      {/* 마스트헤드 */}
      <header className="flex items-center justify-between border-b border-black/10 px-5 py-5 sm:px-10">
        <span className="text-sm font-extrabold tracking-[-0.02em]">CineFit</span>
        <span className={`${lora.className} text-[11px] italic tracking-[0.02em] text-black/65`}>
          Curator&apos;s Desk — Vol. 02
        </span>
      </header>

      {/* 히어로 — 비주얼 오브젝트 없음. 문장 자체가 인터페이스 */}
      <section className="border-b border-black/10 px-5 py-16 sm:px-10 sm:py-24">
        <Reveal>
          <p className={`${lora.className} text-xs italic tracking-[0.05em] text-black/65`}>
            CineFit 편집팀이 지금 조건을 분석합니다
          </p>
          <h1 className="mt-4 max-w-2xl break-keep text-[9vw] font-extrabold leading-[1.08] tracking-[-0.03em] sm:text-5xl lg:text-6xl">
            이번 영화의{' '}
            <span className="relative whitespace-nowrap">
              관람 조건
              <svg
                aria-hidden
                viewBox="0 0 100 8"
                preserveAspectRatio="none"
                className="absolute -bottom-1 left-0 h-2 w-full"
              >
                <path d="M0 5 Q25 1 50 5 T100 4" fill="none" stroke={RED} strokeWidth="3" />
              </svg>
            </span>
            을 분석합니다.
          </h1>
        </Reveal>

        <Reveal delayMs={150}>
          <p className="mt-8 max-w-md break-keep text-sm leading-[1.75] text-black/60">
            <span className="mr-1 align-super text-[10px]">*</span>
            {SERVICE_STATEMENT}
          </p>
          <p className="mt-6 text-base">
            지금 바로{' '}
            <Link
              href="/movies"
              className="min-h-11 border-b-2 pb-0.5 font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
              style={{ borderColor: RED, color: RED, outlineColor: RED }}
            >
              비교를 시작
            </Link>
            해 보세요 <span aria-hidden>→</span>
          </p>
        </Reveal>
      </section>

      {/* 선정 목록 — 카드 아님. 번호 붙은 큐레이터 메모 */}
      <section aria-label="큐레이터 선정작" className="px-5 py-14 sm:px-10">
        <p className={`${lora.className} text-xs italic tracking-[0.05em] text-black/65`}>Selected for you</p>
        <ol className="m-0 mt-6 list-none divide-y divide-black/10 p-0">
          {LAB_MOVIES.map((m, i) => (
            <li key={m.id}>
              <Reveal delayMs={i * 90}>
                <div className="grid grid-cols-[2.5rem_1fr] gap-x-4 gap-y-2 py-8 sm:grid-cols-[3rem_1fr_auto] sm:items-baseline sm:gap-x-6">
                  <span className="font-mono text-sm text-black/65">{String(i + 1).padStart(2, '0')}</span>
                  <div className="sm:col-start-2">
                    <h3 className="text-xl font-bold tracking-[-0.02em] sm:text-2xl">{m.title}</h3>
                    <p className={`${lora.className} mt-1.5 max-w-[50ch] break-keep text-sm italic text-black/65`}>
                      {m.note}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                      <span className="border-b border-dotted" style={{ borderColor: RED }}>
                        {m.ratioLabel}
                      </span>
                      {m.formats.map((f) => (
                        <span key={f} className="border-b border-dotted" style={{ borderColor: RED }}>
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                  <Link
                    href="/movies"
                    className="col-span-2 mt-2 inline-flex min-h-11 w-fit items-center gap-2 text-sm font-bold transition-opacity hover:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 sm:col-span-1 sm:col-start-3 sm:mt-0 sm:justify-self-end"
                    style={{ color: RED, outlineColor: RED }}
                  >
                    <span
                      aria-hidden
                      className="flex h-4 w-4 items-center justify-center border"
                      style={{ borderColor: RED }}
                    >
                      <span className="block h-1.5 w-1.5" style={{ background: RED }} />
                    </span>
                    선택 →
                  </Link>
                </div>
              </Reveal>
            </li>
          ))}
        </ol>
      </section>

      {/* 편집 기준 — 하나의 노트카드 안에 체크리스트로 */}
      <Reveal>
        <section className="px-5 pb-16 sm:px-10">
          <div className="border border-black/15 p-6 sm:p-8">
            <p className={`${lora.className} text-xs italic tracking-[0.05em] text-black/65`}>Editorial criteria</p>
            <div className="mt-5 grid grid-cols-1 gap-x-10 gap-y-5 sm:grid-cols-2">
              {CRITERIA.map((c) => (
                <div key={c.label} className="flex gap-3">
                  <CheckMark className="mt-1 h-4 w-4 shrink-0" />
                  <div>
                    <p className="text-sm font-bold">{c.label}</p>
                    <p className="mt-0.5 break-keep text-xs text-black/65">{c.detail}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 border-t border-black/10 pt-6">
              <p className={`${lora.className} text-xs italic tracking-[0.05em] text-black/65`}>Trust legend</p>
              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-xs text-black/65">
                {TRUST_LEVELS.map((t) => (
                  <span key={t.label}>
                    <span className="font-bold text-black">{t.label}</span> · {t.detail}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <p className="mt-10 text-base">
            준비됐다면{' '}
            <Link
              href="/movies"
              className="min-h-11 border-b-2 pb-0.5 font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"
              style={{ borderColor: RED, color: RED, outlineColor: RED }}
            >
              보고 싶은 영화를 선택
            </Link>
            해 보세요 <span aria-hidden>→</span>
          </p>
        </section>
      </Reveal>
    </div>
  );
}
