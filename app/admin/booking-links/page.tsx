import { redirect } from 'next/navigation';
import { BOOKING_LINK_STATUS_LABELS } from '../../../src/domain/bookingLink/checker';
import { bookingLinkRepository } from '../../../src/data/bookingLinkRepository';
import { isAdminAuthed } from '../../../src/lib/adminAuthServer';

const dt = new Intl.DateTimeFormat('ko-KR', {
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'Asia/Seoul',
});

export default async function AdminBookingLinksPage() {
  if (!(await isAdminAuthed())) redirect('/admin/login');
  const rows = await bookingLinkRepository.listLatestChecks();
  const uncheckedCount = rows.filter((r) => r.status === null).length;

  return (
    <main>
      <h1>예매 링크 상태</h1>
      <p className="sub">
        {rows.length}건 (활성·비합성 회차 기준, 검증 이력 없음 {uncheckedCount}건). 검증은{' '}
        <code>npm run maintenance:links</code>로 실행합니다 — 페이지 본문은 읽지 않고 HTTP 상태만
        확인해요.
      </p>
      <div className="table-scroll" tabIndex={0} role="region" aria-label="예매 링크 상태 (가로 스크롤)">
        <table className="compare">
          <thead>
            <tr>
              <th scope="col">상영</th>
              <th scope="col">상영관</th>
              <th scope="col">시작</th>
              <th scope="col">예매 URL</th>
              <th scope="col">상태</th>
              <th scope="col">최근 확인</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.showtimeId}>
                <td>{r.movieTitle}</td>
                <td>{r.auditoriumLabel}</td>
                <td>{dt.format(new Date(r.startsAt))}</td>
                <td style={{ maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.bookingUrl}
                </td>
                <td>{r.status ? BOOKING_LINK_STATUS_LABELS[r.status] : '미확인'}</td>
                <td>{r.checkedAt ? dt.format(new Date(r.checkedAt)) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
