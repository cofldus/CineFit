// R21 — 관리자 추천 추적: 최근 실행 목록. 상세에서 trace(퍼널·제외 사유·점수)를 본다.
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { recommendationRepository } from '../../../src/data/recommendationRepository';
import { movieRepository } from '../../../src/data/movieRepository';
import { isAdminAuthed } from '../../../src/lib/adminAuthServer';

export const dynamic = 'force-dynamic';

const dtFmt = new Intl.DateTimeFormat('ko-KR', {
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'Asia/Seoul',
});

export default async function AdminRunsPage() {
  if (!(await isAdminAuthed())) redirect('/admin/login');
  const runs = await recommendationRepository.listRecentRuns(50);
  const movies = await movieRepository.list();
  const titleOf = (id: number) => movies.find((m) => m.id === id)?.title ?? `영화 #${id}`;

  return (
    <main>
      <h1>추천 추적 (recommendation trace)</h1>
      <p className="sub">
        최근 실행 {runs.length}건 — 각 실행에서 “왜 제외됐는지·왜 1위인지”를 재현할 수 있어요.
      </p>
      <div className="table-scroll" tabIndex={0} role="region" aria-label="최근 추천 실행 (가로 스크롤)">
        <table className="compare">
          <thead>
            <tr>
              <th>ID</th>
              <th>시각</th>
              <th>영화</th>
              <th>후보</th>
              <th>제외</th>
              <th>정책</th>
              <th>지연(ms)</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {runs.map((r) => (
              <tr key={r.id}>
                <td>#{r.id}</td>
                <td>{dtFmt.format(new Date(r.createdAt))}</td>
                <td>{titleOf(r.movieId)}</td>
                <td>{r.candidateCount === 0 ? '0 (zero result)' : r.candidateCount}</td>
                <td>{r.excludedCount}</td>
                <td>{r.policyVersion ?? '—'}</td>
                <td>{r.latencyMs ?? '—'}</td>
                <td>
                  <Link href={`/admin/runs/${r.id}`}>상세</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
