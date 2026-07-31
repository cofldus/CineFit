import Link from 'next/link';
import { INFO_STATUS_LABELS } from '../src/domain/recommendation/presets';
import { IconArrowRight } from './Icon';

// 사용자 입장에서 비슷하게 느껴지는 "영화-포맷 궁합"과 "상영관 실제 설비"를 하나로
// 합치고(화질과 사운드), 나머지도 3개 그룹으로 정리했다 — 4개 항목을 전부 같은 무게로
// 나열하니 푸터 정보처럼 보인다는 피드백. 글자 크기도 키워서 서비스의 차별점으로 읽히게 했다.
const CRITERIA = [
  { label: '화질과 사운드', detail: '영화의 화면비와 상영관 설비가 잘 맞는지 확인해요' },
  { label: '좌석 품질', detail: '남아 있는 좌석 중 실제로 볼 만한 구역을 판단해요' },
  { label: '시간과 비용', detail: '이동 시간, 회차, 가격을 함께 비교해요' },
] as const;

// 실제 앱에서 쓰는 신뢰도 등급 라벨을 그대로 가져온다(src/domain/recommendation/presets.ts)
// — 홈에서만 다른 문구를 쓰면 나중에 /sources 등 다른 화면과 말이 어긋난다.
const TRUST_KEYS = ['official', 'multi_source', 'user_report', 'estimated'] as const;

// "CineFit이 무엇을 비교하는지" 요약 + 마지막 CTA. 사이트 전역 토큰을 그대로 쓴다.
export function HomeClosing() {
  return (
    <section className="enter-3 border-t border-border px-5 py-14 sm:px-10 sm:py-16">
      <h2 className="font-wanted m-0 text-center text-xl font-bold tracking-[-0.01em] text-text">
        CineFit이 비교하는 것
      </h2>
      <div className="mx-auto mt-8 grid max-w-4xl grid-cols-1 gap-6 sm:grid-cols-3 sm:gap-8">
        {CRITERIA.map((c) => (
          <div key={c.label} className="rounded-card-lg border border-border bg-surface p-5">
            <p className="m-0 text-lg font-bold text-text">{c.label}</p>
            <p className="m-0 mt-1.5 break-keep text-[15px] leading-relaxed text-text-sub">{c.detail}</p>
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
          className="group inline-flex min-h-12 items-center justify-center gap-1.5 rounded-card bg-primary-strong px-8 text-base font-semibold text-white transition-all hover:bg-primary-strong-hover hover:shadow-float focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-strong active:scale-[0.98]"
        >
          어디서 볼지 찾아보기
          <IconArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </section>
  );
}
