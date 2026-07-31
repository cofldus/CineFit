import type { Metadata } from 'next';
import { Notice } from '../../components/Notice';
import { TrustBadge } from '../../components/TrustBadge';
import { sourceRepository } from '../../src/data/sourceRepository';
import type { InfoStatus } from '../../src/domain/recommendation/types';

export const metadata: Metadata = { title: '데이터 출처·신뢰도' };
export const dynamic = 'force-dynamic';

const STATUS_ORDER: InfoStatus[] = [
  'official',
  'multi_source',
  'user_report',
  'single_unverified',
  'estimated',
  'rumor',
  'outdated',
  'conflict',
];

const KIND_LABELS: Record<string, string> = {
  official_api: '공식 API',
  official_site: '공식 사이트',
  press: '언론·보도자료',
  partner: '제휴',
  admin: '관리자 확인',
  user_report: '사용자 제보',
  community: '커뮤니티',
  spike_seed: '검증용 합성',
};

// 8단계 상태를 이용자가 실제로 판단에 쓸 3그룹으로 요약 — 기본 화면엔 이 3그룹만 보이고,
// 8단계 원본 기준은 펼쳐야 보인다(브리프: "8단계를 3그룹으로 요약, 전체 기준은 펼쳐서만").
const TRUST_GROUPS: { title: string; detail: string; statuses: InfoStatus[]; tone: 'high' | 'mid' | 'low' }[] = [
  {
    title: '높은 신뢰도',
    detail: '공식 출처로 확인됐거나, 서로 다른 출처 여러 곳이 같은 내용을 가리켜요.',
    statuses: ['official', 'multi_source'],
    tone: 'high',
  },
  {
    title: '참고 정보',
    detail: '사용자 제보 또는 출처 하나로만 확인돼, 참고는 되지만 아직 교차 확인되지 않았어요.',
    statuses: ['user_report', 'single_unverified'],
    tone: 'mid',
  },
  {
    title: '추정 정보',
    detail: '추정치이거나, 확인되지 않은 소문·오래된 값·서로 다른 출처가 어긋나는 값이에요.',
    statuses: ['estimated', 'rumor', 'outdated', 'conflict'],
    tone: 'low',
  },
];

const GROUP_TONE_CLS: Record<'high' | 'mid' | 'low', string> = {
  high: 'border-trust-high/40 text-trust-high',
  mid: 'border-trust-mid/40 text-trust-mid',
  low: 'border-trust-low/40 text-trust-low',
};

export default async function SourcesPage() {
  const sources = await sourceRepository.list();

  return (
    <main className="mx-auto max-w-content px-4 pb-24 pt-10 sm:pt-14">
      <h1 className="font-wanted m-0 text-[28px] font-bold tracking-[-0.02em] text-text sm:text-[32px]">
        정보 출처·신뢰도 기준
      </h1>
      <p className="m-0 mt-2.5 leading-relaxed text-text-sub">
        CineFit의 모든 사양 값에는 출처·정보 상태·확인일이 함께 붙어요. 근거가 약한 정보일수록
        추천 점수가 자동으로 낮아져요.
      </p>
      <div className="mt-4">
        <Notice>
          현재 회차·가격 데이터는 <strong className="font-semibold">검증용 합성 시드</strong>예요(출처:
          “스파이크 합성 시드”). 실제 상영 정보가 아니며, 실서비스 전에는 사용되지 않아요.
        </Notice>
      </div>

      <h2 className="mt-8 text-lg font-bold text-text">정보를 얼마나 믿을 수 있는지</h2>
      <ul className="m-0 mt-3 flex list-none flex-col gap-2 p-0">
        {TRUST_GROUPS.map((g) => (
          <li key={g.title} className={`rounded-card-lg border px-4 py-3.5 ${GROUP_TONE_CLS[g.tone]}`}>
            <p className="m-0 text-[15px] font-semibold">{g.title}</p>
            <p className="m-0 mt-0.5 text-[13.5px] leading-relaxed text-text-sub">{g.detail}</p>
          </li>
        ))}
      </ul>
      <details className="mt-3">
        <summary className="flex min-h-11 cursor-pointer items-center text-[13.5px] font-medium text-text hover:underline decoration-border-strong underline-offset-2">
          8단계 원본 기준 전체 보기
        </summary>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {STATUS_ORDER.map((s) => (
            <TrustBadge key={s} status={s} />
          ))}
        </div>
      </details>

      <h2 className="mt-8 text-lg font-bold text-text">등록된 출처</h2>
      <ul className="m-0 mt-3 flex list-none flex-col divide-y divide-border p-0">
        {sources.map((s) => (
          <li key={s.id} className="flex flex-col gap-1 py-3.5">
            <p className="m-0 font-semibold text-text">
              {s.url ? (
                <a
                  className="text-text hover:underline decoration-border-strong underline-offset-2"
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {s.name}
                </a>
              ) : (
                s.name
              )}
            </p>
            <p className="m-0 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13.5px] text-text-sub">
              <span>{KIND_LABELS[s.kind] ?? s.kind}</span>
              <span className="tabular-nums">· 신뢰 가중치 {s.trust_weight.toFixed(2)}</span>
              {!s.url ? <span>· 출처 URL 없음</span> : null}
            </p>
            {s.terms_note ? <p className="m-0 text-[13.5px] text-text-sub">{s.terms_note}</p> : null}
          </li>
        ))}
      </ul>

      <p className="mt-6 text-sm text-text-sub">
        검증 대기 항목 관리:{' '}
        <a
          className="text-text hover:underline decoration-border-strong underline-offset-2"
          href="https://github.com/cofldus/CineFit/blob/main/docs/90-verification-register.md"
          target="_blank"
          rel="noopener noreferrer"
        >
          docs/90-verification-register.md
        </a>
      </p>
    </main>
  );
}
