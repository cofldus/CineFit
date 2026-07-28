import { redirect } from 'next/navigation';
import { AdminShowtimeForm, type AdminFormInitial } from '../../../../components/AdminShowtimeForm';
import { getShowtime } from '../../../../src/data/adminShowtimeService';
import { cinemaRepository } from '../../../../src/data/cinemaRepository';
import { movieRepository } from '../../../../src/data/movieRepository';
import { isAdminAuthed } from '../../../../src/lib/adminAuthServer';

const seoulTime = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'Asia/Seoul',
});

export default async function AdminNewShowtimePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  if (!(await isAdminAuthed())) redirect('/admin/login');
  const { from } = await searchParams;

  let initial: AdminFormInitial = {};
  let duplicateOf: number | undefined;
  if (from) {
    const src = await getShowtime(Number(from));
    if (src) {
      duplicateOf = src.id;
      initial = {
        movieId: src.movie_id,
        auditoriumId: src.auditorium_id,
        startTime: seoulTime.format(new Date(src.starts_at)),
        endTime: seoulTime.format(new Date(src.ends_at_est)),
        format: src.format,
        is3d: Boolean(src.is_3d),
        language: src.language ?? 'sub',
        price: src.price_adult,
        bookingUrl: src.booking_url ?? '',
        infoStatus: src.info_status,
        isSynthetic: Boolean(src.is_synthetic),
        adminNote: src.admin_note ?? undefined,
        mismatchNote: src.format_mismatch_note ?? undefined,
        // 날짜는 의도적으로 비움 — 복제 시 새 날짜 입력 강제
      };
    }
  }

  return (
    <main>
      <h1>{duplicateOf ? `회차 복제 (#${duplicateOf} 기반)` : '새 회차 등록'}</h1>
      <p className="notice" role="note">
        공식 예매 페이지에서 확인한 회차만 “공식 확인”으로 등록하세요. 확인 출처와 예매 딥링크는
        필수입니다.
      </p>
      <AdminShowtimeForm
        movies={(await movieRepository.list()).map((m) => ({ id: m.id, label: `${m.title} (${m.runtimeMin}분)` }))}
        auditoriums={(await cinemaRepository.listAuditoriums()).map((a) => ({ id: a.id, label: `${a.label} [${a.brand}]` }))}
        initial={initial}
        duplicateOf={duplicateOf}
      />
    </main>
  );
}
