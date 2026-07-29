import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { AdminPrivacyRequestActions } from '../../../../components/AdminPrivacyRequestActions';
import { privacyRequestService } from '../../../../src/data/privacyRequestService';
import { isAdminAuthed } from '../../../../src/lib/adminAuthServer';

const dt = new Intl.DateTimeFormat('ko-KR', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'Asia/Seoul',
});

const SESSION_PREVIEW_LABELS: Record<string, string> = {
  analyticsEvents: '분석 이벤트',
  recommendationFeedback: '추천 피드백',
  recommendationSelections: '추천 선택 기록',
  postWatchSurveys: '관람 후 평가',
  alphaSurveys: '알파 설문',
  inviteCodeRedemptions: '초대 코드 사용 기록',
  alphaConsents: '참여 동의 기록',
  recommendationRunsLinked: '연결된 추천 실행 기록(삭제하지 않고 세션 연결만 해제)',
};

export default async function AdminPrivacyRequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdminAuthed())) redirect('/admin/login');
  const id = Number((await params).id);
  const request = Number.isInteger(id) ? await privacyRequestService.get(id) : null;
  if (!request) notFound();
  const preview = await privacyRequestService.previewImpact(id);

  return (
    <main>
      <h1>삭제 요청 #{id}</h1>
      <div className="row" style={{ marginBottom: 12 }}>
        <span className="badge">{request.requestType === 'session' ? '세션 데이터 삭제' : '제보 이메일 삭제'}</span>
        <span className="badge badge-mid">{request.status}</span>
        <Link className="btn" href="/admin/privacy-requests">
          목록으로
        </Link>
      </div>

      <div className="card">
        <ul className="plain">
          <li>요청일: {dt.format(new Date(request.requestedAt))}</li>
          <li>
            대상: <code>{request.requestType === 'session' ? request.sessionId : request.contactEmail}</code>
          </li>
          {request.message ? <li>요청자 메모: {request.message}</li> : null}
          {request.reviewedAt ? (
            <li>
              처리: {dt.format(new Date(request.reviewedAt))} ({request.reviewedBy})
            </li>
          ) : null}
          {request.resolutionNote ? <li>반려 사유: {request.resolutionNote}</li> : null}
          {request.affectedSummary ? (
            <li>
              처리 결과: <pre style={{ overflowX: 'auto', display: 'inline' }}>{JSON.stringify(request.affectedSummary, null, 2)}</pre>
            </li>
          ) : null}
        </ul>
      </div>

      <h2>{request.status === 'pending' ? '삭제 시 영향받을 데이터 (미리보기)' : '요청 시점 데이터 현황'}</h2>
      <div className="card">
        {preview?.type === 'session' ? (
          <ul className="plain">
            {!preview.analyticsSessionExists ? (
              <li>이 세션 id는 analytics_sessions에 존재하지 않습니다 — 이미 삭제됐거나 잘못된 값일 수 있습니다.</li>
            ) : null}
            {Object.entries(SESSION_PREVIEW_LABELS).map(([key, label]) => (
              <li key={key}>
                {label}: {(preview as unknown as Record<string, number>)[key]}건
              </li>
            ))}
          </ul>
        ) : preview?.type === 'email' ? (
          <>
            <p className="sub">이 이메일로 남긴 제보 {preview.matchingReports.length}건의 연락 이메일을 지웁니다(제보 내용 자체는 유지).</p>
            <ul className="plain">
              {preview.matchingReports.map((r) => (
                <li key={r.id}>
                  #{r.id} ({dt.format(new Date(r.submittedAt))}) — {r.summary}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="sub">미리보기를 불러올 수 없습니다.</p>
        )}
      </div>

      <h2>처리</h2>
      <AdminPrivacyRequestActions requestId={id} status={request.status} />
    </main>
  );
}
