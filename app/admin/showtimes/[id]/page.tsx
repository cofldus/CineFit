import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { AdminShowtimeForm } from '../../../../components/AdminShowtimeForm';
import { AdminStatusButton } from '../../../../components/AdminStatusButton';
import { getShowtime, listChanges } from '../../../../src/data/adminShowtimeService';
import { cinemaRepository } from '../../../../src/data/cinemaRepository';
import { movieRepository } from '../../../../src/data/movieRepository';
import { isAdminAuthed } from '../../../../src/lib/adminAuthServer';

const seoulDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' });
const seoulTime = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'Asia/Seoul',
});

export default async function AdminEditShowtimePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await isAdminAuthed())) redirect('/admin/login');
  const id = Number((await params).id);
  const showtime = Number.isInteger(id) ? await getShowtime(id) : null;
  if (!showtime) notFound();

  const changes = await listChanges(id);

  return (
    <main>
      <h1>회차 #{id} 수정</h1>
      <div className="row" style={{ marginBottom: 12 }}>
        {showtime.is_synthetic ? (
          <span className="badge badge-mid">≈ 검증용 합성</span>
        ) : (
          <span className="badge badge-high">✔ 관리자 확인</span>
        )}
        <span className="badge">{showtime.status === 'active' ? '활성' : '비활성'}</span>
        <AdminStatusButton showtimeId={id} status={showtime.status} />
        <Link className="btn" href={`/admin/showtimes/new?from=${id}`}>
          복제
        </Link>
        {showtime.booking_url ? (
          <a className="btn" href={showtime.booking_url} target="_blank" rel="noopener noreferrer">
            예매 링크 열기↗
          </a>
        ) : null}
      </div>

      <AdminShowtimeForm
        movies={(await movieRepository.list()).map((m) => ({ id: m.id, label: `${m.title} (${m.runtimeMin}분)` }))}
        auditoriums={(await cinemaRepository.listAuditoriums()).map((a) => ({ id: a.id, label: `${a.label} [${a.brand}]` }))}
        showtimeId={id}
        initial={{
          movieId: showtime.movie_id,
          auditoriumId: showtime.auditorium_id,
          date: seoulDate.format(new Date(showtime.starts_at)),
          startTime: seoulTime.format(new Date(showtime.starts_at)),
          endTime: seoulTime.format(new Date(showtime.ends_at_est)),
          format: showtime.format,
          is3d: Boolean(showtime.is_3d),
          language: showtime.language ?? 'sub',
          price: showtime.price_adult,
          bookingUrl: showtime.booking_url ?? '',
          infoStatus: showtime.info_status,
          isSynthetic: Boolean(showtime.is_synthetic),
          status: showtime.status,
          adminNote: showtime.admin_note ?? undefined,
          mismatchNote: showtime.format_mismatch_note ?? undefined,
        }}
      />

      <h2>변경 이력</h2>
      {changes.length === 0 ? (
        <p className="sub">기록 없음</p>
      ) : (
        <ul className="plain sub">
          {changes.map((c, i) => (
            <li key={i}>
              · {c.created_at} — {c.actor} / {c.action}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
