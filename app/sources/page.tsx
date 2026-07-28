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

export default async function SourcesPage() {
  const sources = await sourceRepository.list();

  return (
    <main className="mx-auto max-w-content px-4 pb-24 pt-6">
      <h1 className="text-2xl font-extrabold text-text">정보 출처·신뢰도 기준</h1>
      <p className="mt-2 leading-relaxed text-text-sub">
        CineFit의 모든 사양 값에는 출처·정보 상태·확인일이 함께 붙어요. 근거가 약한 정보일수록
        추천 점수가 자동으로 낮아져요.
      </p>
      <div className="mt-3">
        <Notice>
          현재 회차·가격 데이터는 <strong className="font-semibold">검증용 합성 시드</strong>예요(출처:
          “스파이크 합성 시드”). 실제 상영 정보가 아니며, 실서비스 전에는 사용되지 않아요.
        </Notice>
      </div>

      <h2 className="mt-7 text-lg font-bold text-text">정보를 얼마나 믿을 수 있는지 (8단계)</h2>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {STATUS_ORDER.map((s) => (
          <TrustBadge key={s} status={s} />
        ))}
      </div>

      <h2 className="mt-7 text-lg font-bold text-text">등록된 출처</h2>

      {/* 모바일: 카드형 — 좁은 화면에서 가로 스크롤 표보다 읽기 쉽다 */}
      <ul className="m-0 mt-3 flex list-none flex-col gap-2 p-0 sm:hidden">
        {sources.map((s) => (
          <li key={s.id} className="rounded-card-lg border border-border bg-surface p-4 shadow-card">
            <p className="m-0 font-semibold text-text">
              {s.url ? (
                <a className="text-primary" href={s.url} target="_blank" rel="noopener noreferrer">
                  {s.name}
                </a>
              ) : (
                s.name
              )}
            </p>
            <p className="m-0 mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-text-sub">
              <span>{KIND_LABELS[s.kind] ?? s.kind}</span>
              <span>· 신뢰 가중치 {s.trust_weight.toFixed(2)}</span>
            </p>
            {s.terms_note ? <p className="m-0 mt-1.5 text-sm text-text-sub">{s.terms_note}</p> : null}
            {!s.url ? <p className="m-0 mt-1.5 text-xs text-text-sub">출처 URL 없음</p> : null}
          </li>
        ))}
      </ul>

      {/* 태블릿 이상: 표 */}
      <div
        className="mt-3 hidden overflow-x-auto rounded-card-lg border border-border sm:block"
        tabIndex={0}
        role="region"
        aria-label="출처 목록 (가로 스크롤)"
      >
        <table className="w-full min-w-[480px] border-collapse text-sm">
          <thead>
            <tr>
              <th scope="col" className="border-b border-border p-3 text-left font-bold text-text">
                출처
              </th>
              <th scope="col" className="border-b border-border p-3 text-left font-bold text-text">
                분류
              </th>
              <th scope="col" className="border-b border-border p-3 text-left font-bold text-text">
                신뢰 가중치
              </th>
              <th scope="col" className="border-b border-border p-3 text-left font-bold text-text">
                비고
              </th>
            </tr>
          </thead>
          <tbody>
            {sources.map((s) => (
              <tr key={s.id}>
                <td className="border-b border-border p-3 text-text">
                  {s.url ? (
                    <a className="text-primary" href={s.url} target="_blank" rel="noopener noreferrer">
                      {s.name}
                    </a>
                  ) : (
                    <>
                      {s.name} <span className="text-text-sub">(출처 URL 없음)</span>
                    </>
                  )}
                </td>
                <td className="border-b border-border p-3 text-text">{KIND_LABELS[s.kind] ?? s.kind}</td>
                <td className="border-b border-border p-3 text-text">{s.trust_weight.toFixed(2)}</td>
                <td className="border-b border-border p-3 text-text-sub">{s.terms_note ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-5 text-sm text-text-sub">
        검증 대기 항목 관리:{' '}
        <a
          className="text-primary"
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
