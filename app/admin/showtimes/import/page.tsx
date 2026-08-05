import { redirect } from 'next/navigation';
import { AdminShowtimeImport } from '../../../../components/AdminShowtimeImport';
import { isAdminAuthed } from '../../../../src/lib/adminAuthServer';

export const dynamic = 'force-dynamic';

export default async function AdminShowtimeImportPage() {
  if (!(await isAdminAuthed())) redirect('/admin/login');
  return (
    <main>
      <h1>회차 CSV 일괄 등록</h1>
      <p className="notice" role="note">
        공식 예매 페이지에서 사람이 직접 확인한 회차만 올리세요. sourceUrl(확인한 공식 페이지)과
        checkedAt(확인 시각)은 필수이며, 동일 상영관·시작 시각의 활성 회차는 중복 등록되지 않습니다.
      </p>
      <AdminShowtimeImport />
    </main>
  );
}
