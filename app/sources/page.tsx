import type { Metadata } from 'next';
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

export default function SourcesPage() {
  const sources = sourceRepository.list();

  return (
    <main>
      <h1>데이터 출처·신뢰도</h1>
      <p>
        CineFit의 모든 사양 값에는 출처·정보 상태·확인일이 붙습니다. 신뢰도는 추천 점수에{' '}
        <strong>곱셈 보정(0.6~1.0)</strong>으로 반영되어, 근거가 약한 후보는 점수가 내려갑니다.
      </p>
      <p className="notice" role="note">
        ⚠️ 현재 회차·가격 데이터는 <strong>검증용 합성 시드</strong>입니다(출처: “스파이크 합성
        시드”). 실제 상영 정보가 아니며, 실서비스 전에는 사용되지 않습니다.
      </p>

      <h2>정보 상태 8단계</h2>
      <div className="row" style={{ marginBottom: 16 }}>
        {STATUS_ORDER.map((s) => (
          <TrustBadge key={s} status={s} />
        ))}
      </div>

      <h2>등록된 출처</h2>
      <div className="table-scroll" tabIndex={0} role="region" aria-label="출처 목록 (가로 스크롤)">
        <table className="compare">
          <thead>
            <tr>
              <th scope="col">출처</th>
              <th scope="col">분류</th>
              <th scope="col">신뢰 가중치</th>
              <th scope="col">비고</th>
            </tr>
          </thead>
          <tbody>
            {sources.map((s) => (
              <tr key={s.id}>
                <td>
                  {s.url ? (
                    <a href={s.url} target="_blank" rel="noopener noreferrer">
                      {s.name}
                    </a>
                  ) : (
                    <>
                      {s.name} <span className="sub">(출처 URL 없음)</span>
                    </>
                  )}
                </td>
                <td>{KIND_LABELS[s.kind] ?? s.kind}</td>
                <td>{s.trust_weight.toFixed(2)}</td>
                <td className="sub">{s.terms_note ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="sub" style={{ marginTop: 16 }}>
        검증 대기 항목 관리:{' '}
        <a
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
