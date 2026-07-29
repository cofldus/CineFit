const CRITERIA = [
  { label: '영화와 포맷의 궁합', detail: '화면비·촬영 포맷이 이 상영관 스크린과 맞는지' },
  { label: '상영관의 실제 설비', detail: '영사기·사운드·마스킹이 실제로 확인됐는지' },
  { label: '현재 남은 좌석의 품질', detail: '몰입·자막 가독·멀미 완화 등 목적별 구역' },
  { label: '거리·시간·가격', detail: '지금 실제로 갈 수 있는 선택인지' },
] as const;

/** §4-D — 큰 진술 하나 + 4개 판단 기준을 작은 카드 4개가 아니라 하나의 연속된 editorial
 * composition(번호 + 굵은 라벨 + 짧은 설명 + 가로선)으로 표현한다. 다크 네이비로 히어로와
 * 짝을 이루는 알타네이팅 리듬의 두 번째 다크 섹션. */
export function EditorialDecisionSection() {
  return (
    <section id="decision" className="relative scroll-mt-16 overflow-hidden bg-home-navy py-20">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-1/4 bottom-0 h-[60%] w-[60%]"
        style={{ background: 'radial-gradient(ellipse, rgba(143,194,255,0.14) 0%, transparent 70%)' }}
      />
      <div className="relative mx-auto max-w-[1360px] px-5 sm:px-8">
        <p className="font-display text-4xl font-extrabold leading-[1.05] tracking-[-0.035em] text-home-navy-ink sm:max-w-2xl sm:text-[44px]">
          큰 화면이 언제나 정답은 아닙니다.
        </p>
        <p className="mt-5 max-w-xl text-base leading-[1.65] tracking-[-0.015em] text-home-navy-ink-muted">
          CineFit은 아래 네 가지를 함께 따져서, 지금 조건에 가장 잘 맞는 상영관을 골라드립니다.
        </p>

        <ol className="m-0 mt-14 grid grid-cols-1 gap-x-8 gap-y-10 p-0 sm:grid-cols-2 lg:grid-cols-4">
          {CRITERIA.map((c, i) => (
            <li key={c.label} className="border-t border-white/15 pt-5">
              <span className="font-display text-4xl font-extrabold leading-none tracking-[-0.02em] text-home-ice/80">
                {String(i + 1).padStart(2, '0')}
              </span>
              <h3 className="m-0 mt-4 font-display text-lg font-bold tracking-[-0.03em] text-home-navy-ink">
                {c.label}
              </h3>
              <p className="m-0 mt-2 text-sm leading-[1.65] tracking-[-0.015em] text-home-navy-ink-muted">
                {c.detail}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
