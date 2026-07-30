import Link from 'next/link';
import { INFO_STATUS_LABELS } from '../src/domain/recommendation/presets';

const CRITERIA = [
  { label: '영화와 포맷의 궁합', detail: '화면비·촬영 포맷이 이 상영관 스크린과 맞는지' },
  { label: '상영관의 실제 설비', detail: '영사기·사운드·마스킹이 실제로 확인됐는지' },
  { label: '현재 남은 좌석의 품질', detail: '몰입·자막 가독·멀미 완화 등 목적별 구역' },
  { label: '거리·시간·가격', detail: '지금 실제로 갈 수 있는 선택인지' },
] as const;

// 실제 앱에서 쓰는 신뢰도 등급 라벨을 그대로 가져온다(src/domain/recommendation/presets.ts)
// — 홈에서만 다른 문구를 쓰면 나중에 /sources 등 다른 화면과 말이 어긋난다.
const TRUST_KEYS = ['official', 'multi_source', 'user_report', 'estimated'] as const;

// "CineFit이 무엇을 비교하는지" 요약 + 마지막 CTA. 사이트 전역 토큰을 그대로 쓴다.
export function HomeClosing() {
  return (
    <section className="border-t border-border bg-bg px-5 py-14 sm:px-10 sm:py-16">
      <h2 className="font-wanted m-0 text-center text-lg font-bold tracking-[-0.01em] text-text">
        CineFit이 비교하는 것
      </h2>
      <div className="mx-auto mt-8 grid max-w-4xl grid-cols-1 gap-x-8 gap-y-8 sm:grid-cols-4">
        {CRITERIA.map((c) => (
          <div key={c.label} className="flex gap-3 sm:flex-col sm:gap-0">
            <span aria-hidden className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent sm:mb-3" />
            <div>
              <p className="m-0 text-sm font-bold text-text">{c.label}</p>
              <p className="m-0 mt-1 break-keep text-xs text-text-sub">{c.detail}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mx-auto mt-12 flex max-w-3xl flex-wrap items-center justify-center gap-x-8 gap-y-2 text-xs text-text-sub">
        {TRUST_KEYS.map((k) => (
          <span key={k}>{INFO_STATUS_LABELS[k]}</span>
        ))}
      </div>

      <div className="mt-10 text-center">
        <Link
          href="/movies"
          className="inline-flex min-h-12 items-center justify-center rounded-card bg-primary-strong px-8 text-base font-semibold text-white transition-colors hover:bg-primary-strong-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-strong"
        >
          보고 싶은 영화를 선택해 보세요
        </Link>
      </div>
    </section>
  );
}
