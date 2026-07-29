import Link from 'next/link';
import { redirect } from 'next/navigation';
import { listPendingMovies } from '../../../src/data/identifierLinkageService';
import { isAdminAuthed } from '../../../src/lib/adminAuthServer';

const TIER_LABELS: Record<string, string> = {
  exact: '정확 일치',
  high_confidence: '높은 확신',
  needs_review: '검토 필요',
  conflict: '충돌',
  unmatched: '매칭 없음',
};

export default async function AdminDataLinkagePage() {
  if (!(await isAdminAuthed())) redirect('/admin/login');
  const pending = await listPendingMovies();

  return (
    <main>
      <h1>KOBIS↔KMDb 식별자 연결 검토</h1>
      <p className="sub">
        exact·high_confidence 등급에서 후보가 유일할 때만 자동 연결됩니다. 아래 목록은 자동
        연결되지 않아 사람이 판단해야 하는 영화입니다.
      </p>
      {pending.length === 0 ? (
        <div className="card">
          <p className="sub" style={{ margin: 0 }}>
            검토 대기 중인 연결이 없습니다.
          </p>
        </div>
      ) : (
        <div className="table-scroll" tabIndex={0} role="region" aria-label="검토 대기 목록 (가로 스크롤)">
          <table className="compare">
            <thead>
              <tr>
                <th scope="col">영화</th>
                <th scope="col">후보 수</th>
                <th scope="col">최고 등급</th>
                <th scope="col">관리</th>
              </tr>
            </thead>
            <tbody>
              {pending.map((p) => (
                <tr key={p.movieId}>
                  <td>{p.movieTitle}</td>
                  <td>{p.candidateCount}</td>
                  <td>{TIER_LABELS[p.bestTier] ?? p.bestTier}</td>
                  <td>
                    <Link href={`/admin/data-linkage/${p.movieId}`}>검토</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
