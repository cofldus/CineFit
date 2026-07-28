import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { AdminReportActions } from '../../../../components/AdminReportActions';
import { cinemaRepository } from '../../../../src/data/cinemaRepository';
import { reportService } from '../../../../src/data/reportService';
import { seatZoneRepository } from '../../../../src/data/seatZoneRepository';
import { isAdminAuthed } from '../../../../src/lib/adminAuthServer';
import { REPORT_STATUS_LABELS, REPORT_TYPE_LABELS } from '../../../../src/lib/reportValidation';

const dt = new Intl.DateTimeFormat('ko-KR', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'Asia/Seoul',
});

export default async function AdminReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await isAdminAuthed())) redirect('/admin/login');
  const id = Number((await params).id);
  const report = Number.isInteger(id) ? await reportService.get(id) : null;
  if (!report) notFound();

  const isZoneReport = report.report_type === 'seat_zone' && report.target_type === 'auditorium';
  const activeZones = isZoneReport ? await seatZoneRepository.listActiveForAdmin(report.target_id) : [];
  const auditoriumLabel =
    report.target_type === 'auditorium'
      ? (await cinemaRepository.listAuditoriums()).find((a) => a.id === report.target_id)?.label
      : null;

  let claimedPretty = report.claimed_value_json;
  try {
    claimedPretty = JSON.stringify(JSON.parse(report.claimed_value_json), null, 2);
  } catch {
    // 원문 유지
  }

  return (
    <main>
      <h1>제보 #{id}</h1>
      <div className="row" style={{ marginBottom: 12 }}>
        <span className="badge">{REPORT_TYPE_LABELS[report.report_type as keyof typeof REPORT_TYPE_LABELS] ?? report.report_type}</span>
        <span className="badge badge-mid">{REPORT_STATUS_LABELS[report.status] ?? report.status}</span>
        <Link className="btn" href="/admin/reports">
          목록으로
        </Link>
      </div>

      <div className="card">
        <ul className="plain">
          <li>
            대상:{' '}
            {report.target_type === 'auditorium' ? (
              <Link href={`/cinemas/${report.target_id}`}>
                상영관 #{report.target_id}
                {auditoriumLabel ? ` — ${auditoriumLabel}` : ''}
              </Link>
            ) : (
              <>회차 #{report.target_id}</>
            )}
          </li>
          <li>접수: {dt.format(new Date(report.submitted_at))}</li>
          {report.observed_at ? <li>관찰일(제보값): {report.observed_at}</li> : null}
          <li>
            증빙:{' '}
            {report.evidence_url ? (
              <a href={report.evidence_url} target="_blank" rel="noopener noreferrer nofollow">
                {report.evidence_url}↗
              </a>
            ) : (
              '없음'
            )}
          </li>
          {report.reviewed_at ? (
            <li>
              검토: {dt.format(new Date(report.reviewed_at))} ({report.reviewed_by})
            </li>
          ) : null}
          {report.moderator_note ? <li>관리자 메모: {report.moderator_note}</li> : null}
          {report.resolution ? <li>처리 결과: {report.resolution}</li> : null}
          {report.promoted_observation_id ? <li>관찰 기록 id: {report.promoted_observation_id}</li> : null}
          {report.promoted_entity_type ? (
            <li>
              반영 대상: {report.promoted_entity_type} #{report.promoted_entity_id}
            </li>
          ) : null}
        </ul>
      </div>

      <h2>제보 내용</h2>
      <div className="card">
        <p>{report.summary}</p>
        <pre style={{ overflowX: 'auto' }}>{claimedPretty}</pre>
      </div>

      {isZoneReport && activeZones.length > 0 ? (
        <>
          <h2>현재 활성 좌석 존</h2>
          <ul className="plain sub">
            {activeZones.map((z) => (
              <li key={z.id}>
                #{z.id} {z.rowRange ?? '행 미상'} {z.colRange ?? ''} — {z.purposes.join(', ')} (신뢰도 {z.confidence})
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <h2>검토</h2>
      <AdminReportActions
        reportId={id}
        status={report.status}
        reportType={report.report_type}
        targetType={report.target_type}
        activeZones={activeZones}
      />
    </main>
  );
}
