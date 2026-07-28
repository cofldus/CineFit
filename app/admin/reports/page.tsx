import Link from 'next/link';
import { redirect } from 'next/navigation';
import { reportService } from '../../../src/data/reportService';
import { isAdminAuthed } from '../../../src/lib/adminAuthServer';
import { REPORT_STATUS_LABELS, REPORT_TYPE_LABELS, REPORT_TYPES } from '../../../src/lib/reportValidation';

const dt = new Intl.DateTimeFormat('ko-KR', {
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'Asia/Seoul',
});

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  if (!(await isAdminAuthed())) redirect('/admin/login');
  const q = await searchParams;
  const rows = await reportService.list({
    status: q.status || undefined,
    reportType: q.reportType || undefined,
  });

  return (
    <main>
      <h1>제보 검토</h1>
      <form method="get" className="card" aria-label="제보 필터">
        <div className="row">
          <label className="field" style={{ flex: 1, minWidth: 140 }}>
            <span>상태</span>
            <select name="status" defaultValue={q.status ?? ''}>
              <option value="">전체</option>
              {Object.entries(REPORT_STATUS_LABELS).map(([v, label]) => (
                <option key={v} value={v}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="field" style={{ flex: 1, minWidth: 140 }}>
            <span>유형</span>
            <select name="reportType" defaultValue={q.reportType ?? ''}>
              <option value="">전체</option>
              {REPORT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {REPORT_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button type="submit" className="btn">
          필터 적용
        </button>
      </form>

      <p className="sub">{rows.length}건 (최근 200건까지)</p>
      <div className="table-scroll" tabIndex={0} role="region" aria-label="제보 목록 (가로 스크롤)">
        <table className="compare">
          <thead>
            <tr>
              <th scope="col">접수</th>
              <th scope="col">유형</th>
              <th scope="col">대상</th>
              <th scope="col">요약</th>
              <th scope="col">증빙</th>
              <th scope="col">상태</th>
              <th scope="col">관리</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{dt.format(new Date(r.submitted_at))}</td>
                <td>{REPORT_TYPE_LABELS[r.report_type as keyof typeof REPORT_TYPE_LABELS] ?? r.report_type}</td>
                <td>
                  {r.target_type === 'auditorium' ? '상영관' : '회차'} #{r.target_id}
                </td>
                <td style={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.summary}
                </td>
                <td>{r.evidence_url ? '있음' : '—'}</td>
                <td>{REPORT_STATUS_LABELS[r.status] ?? r.status}</td>
                <td>
                  <Link href={`/admin/reports/${r.id}`}>검토</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
