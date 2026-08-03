import Link from 'next/link';
import { INFO_STATUS_LABELS } from '../src/domain/recommendation/presets';
import type { InfoStatus } from '../src/domain/recommendation/types';

// 홈 하단(R14 §7) — "우리 서비스는 이런 기능을 제공합니다"식 3칸 소개를 걷어내고, 실제
// 정보를 제공하는 세 섹션으로 교체: 최근 확인된 상영관 정보(실제 관측 기록) · 영화관 선택
// 가이드(결정을 돕는 짧은 정보형 콘텐츠) · 데이터 투명성(신뢰 등급이 실제로 뜻하는 것).
// 동일 CTA 반복 금지 — 하단은 조용한 맥락 링크만 둔다.

export interface RecentObservation {
  auditoriumId: number;
  auditoriumLabel: string;
  field: string;
  observedAt: string;
  infoStatus: InfoStatus;
  sourceName: string | null;
}

// 관측 필드(projector.imax_grade 등)를 사용자 언어로 — 내부 코드명을 일반 화면에 그대로
// 노출하지 않는다(R14 §3). 매핑에 없으면 대분류만 보여준다.
const FIELD_GROUP_LABELS: Record<string, string> = {
  projector: '영사기 사양',
  screen: '스크린 사양',
  sound: '사운드 사양',
  seat: '좌석 정보',
  seats: '좌석 정보',
};

function fieldLabel(field: string): string {
  const group = field.split('.')[0];
  return FIELD_GROUP_LABELS[group] ?? '상영관 사양';
}

const GUIDES = [
  {
    q: '화면비가 왜 중요한가요?',
    a: '영화마다 촬영 화면비(2.39:1, 1.85:1 등)가 다르고, 상영관 스크린 비율과 맞지 않으면 위아래나 좌우에 여백이 생겨 실제 보이는 화면이 작아져요. CineFit은 영화의 화면비 사양과 상영관 설비를 비교해서 그 영화가 가장 크게 보이는 관을 찾아요.',
  },
  {
    q: 'IMAX와 돌비시네마는 뭐가 다른가요?',
    a: 'IMAX는 더 큰 스크린과 확장 화면비(지원 영화에 한해 1.90:1 등) 중심이고, 돌비시네마는 돌비 비전(명암 표현)과 애트모스(천장을 포함한 입체 음향) 중심이에요. 영화마다 IMAX 확장판·돌비 마스터 지원 여부가 달라서, 같은 영화라도 유리한 포맷이 달라요.',
  },
  {
    q: '자막이 편한 좌석은 어디인가요?',
    a: '자막은 화면 하단에 있어서 앞줄일수록 화면과 자막 사이 시선 이동이 커져요. 보통 중간열 이후의 중앙 블록이 자막 읽기에 유리하고, CineFit은 상영관별 제보·추정 구역으로 안내해요(잔여 좌석은 반영되지 않아요).',
  },
] as const;

// 신뢰 등급이 실제로 뜻하는 것 — /sources와 같은 라벨 체계(다른 문구를 쓰면 화면끼리
// 말이 어긋난다), 설명만 한 줄로 압축.
const TRUST_ROWS: { key: InfoStatus; desc: string }[] = [
  { key: 'official', desc: '공식 페이지·공식 API에서 확인' },
  { key: 'multi_source', desc: '독립된 여러 출처가 일치' },
  { key: 'user_report', desc: '사용자 제보 — 검토 후 반영' },
  { key: 'estimated', desc: '규칙 기반 추정 — 확인되면 대체' },
];

const dateFmt = new Intl.DateTimeFormat('ko-KR', { month: 'numeric', day: 'numeric', timeZone: 'Asia/Seoul' });

export function HomeInfo({ observations }: { observations: RecentObservation[] }) {
  return (
    <section className="enter-3 px-5 py-14 sm:px-10 sm:py-16">
      <div className="mx-auto grid max-w-wide gap-12 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:gap-16">
        <div className="flex flex-col gap-12">
          {/* C. 최근 확인된 상영관 정보 — 광고 문구가 아니라 실제 업데이트 기록. */}
          {observations.length > 0 ? (
            <div>
              <h2 className="m-0 text-[20px] font-bold text-text sm:text-[22px]">최근 확인된 상영관 정보</h2>
              {/* 업데이트 타임라인(R15 §3) — 텍스트 목록이 아니라 세로 라인 + 점으로 시간의
                  흐름이 보이는 기록 형태. */}
              <ol className="relative m-0 mt-5 flex list-none flex-col gap-5 p-0 pl-5 before:absolute before:bottom-1 before:left-[3px] before:top-1 before:w-px before:bg-border">
                {observations.map((o, i) => (
                  <li key={`${o.auditoriumId}-${o.field}-${i}`} className="relative">
                    <span
                      aria-hidden
                      className={`absolute -left-5 top-[7px] h-[7px] w-[7px] rounded-full ${i === 0 ? 'bg-primary' : 'bg-border-strong'}`}
                    />
                    <Link href={`/cinemas/${o.auditoriumId}`} className="group block">
                      <span className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
                        <span className="text-[12px] tabular-nums text-text-tertiary">
                          {dateFmt.format(new Date(o.observedAt))} 확인
                        </span>
                        <span className="text-[12.5px] text-text-tertiary">
                          {INFO_STATUS_LABELS[o.infoStatus] ?? o.infoStatus}
                          {o.sourceName ? ` · ${o.sourceName}` : ''}
                        </span>
                      </span>
                      <span className="mt-0.5 block">
                        <span className="font-semibold text-text group-hover:underline decoration-border-strong underline-offset-2">
                          {o.auditoriumLabel}
                        </span>
                        <span className="ml-2 text-[13.5px] text-text-sub">{fieldLabel(o.field)}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}

          {/* D. 영화관 선택 가이드 — 결정을 돕는 짧은 정보형 콘텐츠. 기본은 접혀 있고 필요할
              때 펼친다(progressive disclosure). */}
          <div>
            <h2 className="m-0 text-[20px] font-bold text-text sm:text-[22px]">영화관 선택 가이드</h2>
            <div className="mt-3 divide-y divide-border">
              {GUIDES.map((g) => (
                <details key={g.q} className="group py-1">
                  <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 text-[15px] font-semibold text-text hover:text-primary [&::-webkit-details-marker]:hidden">
                    {g.q}
                    <span aria-hidden className="shrink-0 text-text-tertiary transition-transform group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="m-0 max-w-[62ch] pb-4 text-[14.5px] leading-[1.7] text-text-sub">{g.a}</p>
                </details>
              ))}
            </div>
          </div>
        </div>

        {/* E. 데이터 투명성 — 신뢰를 쌓는 정보지만 홈의 중심을 차지하지 않게 compact. */}
        <div className="lg:pt-1">
          <h2 className="m-0 text-[16px] font-bold text-text">정보를 이렇게 구분해요</h2>
          <ul className="m-0 mt-3 flex list-none flex-col gap-2.5 p-0">
            {TRUST_ROWS.map((t) => (
              <li key={t.key} className="flex items-baseline gap-3 text-[13.5px]">
                <span className="w-[100px] shrink-0 break-keep font-semibold text-text">{INFO_STATUS_LABELS[t.key]}</span>
                <span className="text-text-sub">{t.desc}</span>
              </li>
            ))}
          </ul>
          <div className="mt-6 flex flex-col gap-2 border-t border-border pt-5 text-sm">
            <Link href="/sources" className="font-medium text-text hover:underline decoration-border-strong underline-offset-2">
              출처·신뢰도 기준 자세히 보기 →
            </Link>
            <Link href="/movies" className="font-medium text-text hover:underline decoration-border-strong underline-offset-2">
              전체 영화 보기 →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
