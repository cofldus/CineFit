import Link from 'next/link';
import { redirect } from 'next/navigation';
import { listShowtimes } from '../../src/data/adminShowtimeService';
import { isAdminAuthed } from '../../src/lib/adminAuthServer';

export default async function AdminDashboardPage() {
  if (!(await isAdminAuthed())) redirect('/admin/login');
  const all = listShowtimes();
  const active = all.filter((s) => s.status === 'active');
  const verified = active.filter((s) => !s.is_synthetic);
  const synthetic = active.filter((s) => s.is_synthetic);

  return (
    <main>
      <h1>관리자 대시보드</h1>
      <div className="card">
        <ul className="plain">
          <li>활성 회차: <strong>{active.length}</strong>건</li>
          <li>관리자 확인 회차: <strong>{verified.length}</strong>건</li>
          <li>검증용 합성 회차: <strong>{synthetic.length}</strong>건</li>
          <li>비활성 회차: <strong>{all.length - active.length}</strong>건</li>
        </ul>
        <div className="row">
          <Link className="btn btn-primary" href="/admin/showtimes/new">
            새 회차 등록
          </Link>
          <Link className="btn" href="/admin/showtimes">
            회차 목록
          </Link>
        </div>
      </div>
      <p className="notice" role="note">
        운영 원칙: 회차는 공식 예매 페이지에서 확인 후 딥링크와 함께 등록합니다. 삭제 대신
        비활성화를 사용하고, 모든 변경은 이력에 남습니다 (docs/DEVELOPMENT.md 운영 절차).
      </p>
    </main>
  );
}
