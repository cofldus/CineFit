import Link from 'next/link';
import { redirect } from 'next/navigation';
import { privacyRequestService, type PrivacyRequestStatus } from '../../../src/data/privacyRequestService';
import { isAdminAuthed } from '../../../src/lib/adminAuthServer';

const STATUS_LABELS: Record<PrivacyRequestStatus, string> = {
  pending: '대기 중',
  completed: '처리 완료',
  rejected: '반려됨',
};

const TYPE_LABELS: Record<string, string> = {
  session: '내 이용 데이터 삭제(세션)',
  email: '제보 이메일 삭제',
};

const dt = new Intl.DateTimeFormat('ko-KR', {
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'Asia/Seoul',
});

export default async function AdminPrivacyRequestsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  if (!(await isAdminAuthed())) redirect('/admin/login');
  const q = await searchParams;
  const status = q.status && ['pending', 'completed', 'rejected'].includes(q.status) ? (q.status as PrivacyRequestStatus) : undefined;
  const rows = await privacyRequestService.list(status ? { status } : undefined);

  return (
    <main>
      <h1>개인정보 삭제 요청</h1>
      <p className="sub">
        docs/PRIVATE-ALPHA.md · docs/DATA-RETENTION.md — 세션 유형은 이용자 본인의 브라우저
        쿠키에 담긴 세션 id로만 신원을 확인하고, 이메일 유형은 제보에 남긴 연락 이메일을 지운다.
      </p>
      <form method="get" className="card" aria-label="상태 필터">
        <label className="field" style={{ minWidth: 160 }}>
          <span>상태</span>
          <select name="status" defaultValue={q.status ?? ''}>
            <option value="">전체</option>
            {Object.entries(STATUS_LABELS).map(([v, label]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="btn">
          필터 적용
        </button>
      </form>

      <p className="sub">{rows.length}건</p>
      <div className="table-scroll" tabIndex={0} role="region" aria-label="삭제 요청 목록 (가로 스크롤)">
        <table className="compare">
          <thead>
            <tr>
              <th scope="col">요청일</th>
              <th scope="col">유형</th>
              <th scope="col">대상</th>
              <th scope="col">메모</th>
              <th scope="col">상태</th>
              <th scope="col">관리</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{dt.format(new Date(r.requestedAt))}</td>
                <td>{TYPE_LABELS[r.requestType] ?? r.requestType}</td>
                <td>{r.requestType === 'session' ? r.sessionId : r.contactEmail}</td>
                <td>{r.message ?? ''}</td>
                <td>{STATUS_LABELS[r.status]}</td>
                <td>
                  <Link className="btn" href={`/admin/privacy-requests/${r.id}`}>
                    상세
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
