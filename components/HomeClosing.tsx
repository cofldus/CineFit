import Link from 'next/link';
import { INFO_STATUS_LABELS } from '../src/domain/recommendation/presets';
import { IconArrowRight } from './Icon';

// 흰 박스 3개를 나열하던 것("보험 보장 항목처럼 보인다"는 피드백)을 큰 번호 + 여백으로만
// 잇는 하나의 흐름으로 바꿨다 — 왼쪽 세로선은 다시 넣지 않는다.
const STEPS = [
  { n: '01', label: '화면과 사운드', detail: '영화의 화면비가 상영관 설비와 맞는지 확인해요' },
  { n: '02', label: '좌석 품질', detail: '남아 있는 좌석 중 실제 관람하기 좋은 구역을 판단해요' },
  { n: '03', label: '시간과 비용', detail: '이동, 회차, 가격을 함께 비교해요' },
] as const;

// 실제 앱에서 쓰는 신뢰도 등급 라벨을 그대로 가져온다(src/domain/recommendation/presets.ts)
// — 홈에서만 다른 문구를 쓰면 나중에 /sources 등 다른 화면과 말이 어긋난다.
const TRUST_KEYS = ['official', 'multi_source', 'user_report', 'estimated'] as const;

// "CineFit이 무엇을 비교하는지" 요약 + 마지막 CTA. 위 영화 목록과 하나의 흐름으로 이어지게
// 굵은 구분선을 넣지 않는다(넣으면 "위: 영화 선택 / 아래: 회사 소개"처럼 페이지가 반으로
// 잘린다는 피드백).
export function HomeClosing() {
  return (
    <section id="compare" className="enter-3 px-5 py-14 sm:px-10 sm:py-16">
      <div className="mx-auto max-w-wide">
        <h2 className="type-display m-0 text-[22px] text-text sm:text-[26px]">CineFit이 비교하는 것</h2>
        {/* 설명서식 화살표 나열 대신, 위쪽 헤어라인 위에 번호가 걸린 3열 리듬 — 번호는
            디스플레이 서체 + 로즈 그라데이션으로 브랜드 시스템의 일부처럼. */}
        <div className="mt-8 grid gap-10 border-t border-border pt-8 sm:grid-cols-3 sm:gap-6">
          {STEPS.map((s) => (
            <div key={s.n} className="group relative">
              <span aria-hidden className="absolute -top-8 left-0 h-px w-10 bg-primary/60 transition-all duration-300 group-hover:w-16" />
              <span className="type-display block text-[34px] text-primary sm:text-[40px]">{s.n}</span>
              <p className="m-0 mt-2.5 text-base font-bold text-text">{s.label}</p>
              <p className="m-0 mt-1 max-w-[240px] break-keep text-[14.5px] leading-relaxed text-text-sub">
                {s.detail}
              </p>
            </div>
          ))}
        </div>

        <div className="mx-auto mt-14 flex max-w-3xl flex-wrap items-center justify-center gap-x-8 gap-y-2 text-xs text-text-tertiary">
          {TRUST_KEYS.map((k) => (
            <span key={k}>{INFO_STATUS_LABELS[k]}</span>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/movies"
            className="group inline-flex min-h-12 items-center justify-center gap-1.5 rounded-card bg-primary-strong px-8 text-base font-semibold text-white transition-all hover:bg-primary-strong-hover hover:shadow-float focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-strong active:scale-[0.98]"
          >
            내 조건으로 상영관 비교하기
            <IconArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
