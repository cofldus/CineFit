import Link from 'next/link';
import { redirect } from 'next/navigation';
import { listShowtimes } from '../../../src/data/adminShowtimeService';
import { movieRepository } from '../../../src/data/movieRepository';
import { isAdminAuthed } from '../../../src/lib/adminAuthServer';
import { FORMAT_LABELS } from '../../../src/domain/recommendation/presets';

const dt = new Intl.DateTimeFormat('ko-KR', {
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'Asia/Seoul',
});

export default async function AdminShowtimesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  if (!(await isAdminAuthed())) redirect('/admin/login');
  const q = await searchParams;
  const movies = await movieRepository.list();
  const rows = await listShowtimes({
    date: q.date || undefined,
    movieId: q.movieId ? Number(q.movieId) : undefined,
    format: q.format || undefined,
    status: q.status || undefined,
    synthetic: (q.synthetic as 'synthetic' | 'verified' | undefined) || undefined,
  });

  return (
    <main>
      <h1>회차 관리</h1>
      <form method="get" className="card" aria-label="회차 필터">
        <div className="row">
          <label className="field" style={{ flex: 1, minWidth: 130 }}>
            <span>날짜</span>
            <input type="date" name="date" defaultValue={q.date} />
          </label>
          <label className="field" style={{ flex: 1, minWidth: 130 }}>
            <span>영화</span>
            <select name="movieId" defaultValue={q.movieId ?? ''}>
              <option value="">전체</option>
              {movies.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
            </select>
          </label>
          <label className="field" style={{ flex: 1, minWidth: 120 }}>
            <span>포맷</span>
            <select name="format" defaultValue={q.format ?? ''}>
              <option value="">전체</option>
              {Object.entries(FORMAT_LABELS).map(([v, label]) => (
                <option key={v} value={v}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="field" style={{ flex: 1, minWidth: 120 }}>
            <span>상태</span>
            <select name="status" defaultValue={q.status ?? ''}>
              <option value="">전체</option>
              <option value="active">활성</option>
              <option value="disabled">비활성</option>
            </select>
          </label>
          <label className="field" style={{ flex: 1, minWidth: 130 }}>
            <span>데이터 구분</span>
            <select name="synthetic" defaultValue={q.synthetic ?? ''}>
              <option value="">전체</option>
              <option value="verified">관리자 확인</option>
              <option value="synthetic">검증용 합성</option>
            </select>
          </label>
        </div>
        <button type="submit" className="btn">
          필터 적용
        </button>
      </form>

      <p className="sub">{rows.length}건</p>
      <div className="table-scroll" tabIndex={0} role="region" aria-label="회차 목록 (가로 스크롤)">
        <table className="compare">
          <thead>
            <tr>
              <th scope="col">시작</th>
              <th scope="col">영화</th>
              <th scope="col">상영관</th>
              <th scope="col">포맷</th>
              <th scope="col">가격</th>
              <th scope="col">구분</th>
              <th scope="col">상태</th>
              <th scope="col">관리</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{dt.format(new Date(r.starts_at))}</td>
                <td>{r.movie_title}</td>
                <td>{r.auditorium_label}</td>
                <td>{FORMAT_LABELS[r.format] ?? r.format}</td>
                <td>{r.price_adult.toLocaleString('ko-KR')}원</td>
                <td>
                  {r.is_synthetic ? (
                    <span className="badge badge-mid">≈ 합성</span>
                  ) : (
                    <span className="badge badge-high">✔ 관리자 확인</span>
                  )}
                </td>
                <td>{r.status === 'active' ? '활성' : '비활성'}</td>
                <td className="row" style={{ flexWrap: 'nowrap' }}>
                  <Link href={`/admin/showtimes/${r.id}`}>수정</Link>
                  <Link href={`/admin/showtimes/new?from=${r.id}`}>복제</Link>
                  {r.booking_url ? (
                    <a href={r.booking_url} target="_blank" rel="noopener noreferrer">
                      예매↗
                    </a>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
