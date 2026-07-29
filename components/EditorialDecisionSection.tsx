const CRITERIA = [
  { label: '영화와 포맷의 궁합', detail: '화면비·촬영 포맷이 이 상영관 스크린과 맞는지' },
  { label: '상영관의 실제 설비', detail: '영사기·사운드·마스킹이 실제로 확인됐는지' },
  { label: '현재 남은 좌석의 품질', detail: '몰입·자막 가독·멀미 완화 등 목적별 구역' },
  { label: '거리·시간·가격', detail: '지금 실제로 갈 수 있는 선택인지' },
] as const;

// 폭이 서로 다른 두 칸(7/5, 5/7)을 번갈아 배치해 04개 기준이 "설명 카드 4개"가 아니라
// 리듬이 있는 하나의 조판처럼 보이게 한다.
const SPANS = ['lg:col-span-7', 'lg:col-span-5', 'lg:col-span-5', 'lg:col-span-7'] as const;

/** §4-D — 큰 선언 하나 + 4개 판단 기준을 브랜드 매니페스토처럼 표현한다. 번호는 섹션 배경색과
 * 같은 배경을 깔고 위 경계선 위로 살짝 겹치게 올려(-mt) "숫자가 인쇄 경계를 뚫고 나온" 듯한
 * 조판 효과를 준다 — 장식이 아니라 01~04를 리스트 항목이 아닌 조형 요소로 읽히게 하는 장치. */
export function EditorialDecisionSection() {
  return (
    <section id="decision" className="bg-grain relative scroll-mt-16 overflow-hidden bg-home-navy py-20 lg:py-32">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-1/4 bottom-0 h-[60%] w-[60%]"
        style={{ background: 'radial-gradient(ellipse, rgba(143,194,255,0.1) 0%, transparent 70%)' }}
      />
      <div className="relative mx-auto max-w-[1360px] px-5 sm:px-8 lg:px-16">
        <p className="break-keep font-wanted text-[34px] font-extrabold leading-[1.02] tracking-[-0.04em] text-home-navy-ink sm:text-[52px] lg:max-w-3xl lg:text-[64px]">
          큰 화면이
          <br />
          언제나 정답은 아닙니다.
        </p>
        <p className="mt-6 max-w-md text-base leading-[1.65] tracking-[-0.015em] text-home-navy-ink-muted">
          CineFit은 아래 네 가지를 함께 따져서, 지금 조건에 가장 잘 맞는 상영관을 골라드립니다.
        </p>

        <ol className="m-0 mt-20 grid grid-cols-1 gap-x-8 gap-y-14 p-0 lg:grid-cols-12 lg:gap-y-16">
          {CRITERIA.map((c, i) => (
            <li key={c.label} className={`border-t border-white/15 ${SPANS[i]}`}>
              <span className="-mt-6 inline-block bg-home-navy pr-4 font-wanted text-[56px] font-extrabold leading-none tracking-[-0.02em] text-home-ice/80 sm:-mt-8 sm:text-[72px]">
                {String(i + 1).padStart(2, '0')}
              </span>
              <h3 className="m-0 mt-6 font-wanted text-lg font-bold tracking-[-0.03em] text-home-navy-ink sm:text-xl">
                {c.label}
              </h3>
              <p className="m-0 mt-2 max-w-sm text-sm leading-[1.65] tracking-[-0.015em] text-home-navy-ink-muted">
                {c.detail}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
