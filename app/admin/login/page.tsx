import { redirect } from 'next/navigation';
import { AdminLoginForm } from '../../../components/AdminLoginForm';
import { isAdminAuthed } from '../../../src/lib/adminAuthServer';

export default async function AdminLoginPage() {
  if (await isAdminAuthed()) redirect('/admin');
  return (
    <main>
      <h1>관리자 로그인</h1>
      <AdminLoginForm />
    </main>
  );
}
