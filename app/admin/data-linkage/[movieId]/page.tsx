import { notFound, redirect } from 'next/navigation';
import { ApproveRejectButtons, UnlinkButton } from '../../../../components/AdminIdentifierLinkageForm';
import { getAppDbClient } from '../../../../src/data/client/index';
import { getCandidatesForMovie } from '../../../../src/data/identifierLinkageService';
import { isAdminAuthed } from '../../../../src/lib/adminAuthServer';

const TIER_LABELS: Record<string, string> = {
  exact: '정확 일치',
  high_confidence: '높은 확신',
  needs_review: '검토 필요',
  conflict: '충돌',
  unmatched: '매칭 없음',
};

const STATUS_LABELS: Record<string, string> = { pending: '대기', approved: '승인됨', rejected: '거절됨' };

export default async function AdminDataLinkageDetailPage({
  params,
}: {
  params: Promise<{ movieId: string }>;
}) {
  if (!(await isAdminAuthed())) redirect('/admin/login');
  const movieId = Number((await params).movieId);
  if (!Number.isInteger(movieId)) notFound();

  const movie = (
    await getAppDbClient().query<{ id: number; title: string; original_title: string | null; director: string | null; kmdb_docid: string | null }>(
      `SELECT id, title, original_title, director, kmdb_docid FROM movies WHERE id = ?`,
      [movieId],
    )
  )[0];
  if (!movie) notFound();

  const candidates = await getCandidatesForMovie(movieId);

  return (
    <main>
      <h1>{movie.title}</h1>
      <div className="card">
        <ul className="plain">
          <li>원제: {movie.original_title ?? '—'}</li>
          <li>감독: {movie.director ?? '—'}</li>
          <li>
            현재 연결: {movie.kmdb_docid ? <code>{movie.kmdb_docid}</code> : '연결 안 됨'}
            {movie.kmdb_docid && (
              <span style={{ marginLeft: 8 }}>
                <UnlinkButton movieId={movieId} />
              </span>
            )}
          </li>
        </ul>
      </div>

      <div className="table-scroll" tabIndex={0} role="region" aria-label="KMDb 후보 목록 (가로 스크롤)">
        <table className="compare">
          <thead>
            <tr>
              <th scope="col">DOCID</th>
              <th scope="col">KMDb 제목</th>
              <th scope="col">등급</th>
              <th scope="col">제목 일치</th>
              <th scope="col">감독 일치</th>
              <th scope="col">연도 차이</th>
              <th scope="col">상태</th>
              <th scope="col">관리</th>
            </tr>
          </thead>
          <tbody>
            {candidates.map((c) => (
              <tr key={c.id}>
                <td>
                  <code>{c.kmdbDocid}</code>
                </td>
                <td>{c.kmdbTitle}</td>
                <td>{TIER_LABELS[c.matchTier] ?? c.matchTier}</td>
                <td>{c.matchSignals.titleMatch ? '일치' : '불일치'}</td>
                <td>
                  {c.matchSignals.directorMatch === null ? '정보 없음' : c.matchSignals.directorMatch ? '일치' : '불일치'}
                </td>
                <td>{c.matchSignals.yearDiff ?? '정보 없음'}</td>
                <td>
                  {STATUS_LABELS[c.status] ?? c.status}
                  {c.autoLinked ? ' (자동)' : ''}
                </td>
                <td>
                  <ApproveRejectButtons candidateId={c.id} disabled={c.status !== 'pending'} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
