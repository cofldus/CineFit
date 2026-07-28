import { redirect } from 'next/navigation';
import { AdminFeatureFlagCreateForm, AdminFeatureFlagToggle } from '../../../components/AdminFeatureFlagForm';
import { featureFlagRepository } from '../../../src/data/featureFlagRepository';
import { isAdminAuthed } from '../../../src/lib/adminAuthServer';

const dt = new Intl.DateTimeFormat('ko-KR', {
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'Asia/Seoul',
});

export default async function AdminFeatureFlagsPage() {
  if (!(await isAdminAuthed())) redirect('/admin/login');
  const flags = await featureFlagRepository.list();

  return (
    <main>
      <h1>기능 플래그</h1>
      <p className="sub">
        변경 이력은 감사 로그(audit_logs)에 남습니다. 새 플래그를 켜기 전에 관련 기능이 준비됐는지
        먼저 확인하세요.
      </p>
      <AdminFeatureFlagCreateForm />

      <div className="table-scroll" tabIndex={0} role="region" aria-label="기능 플래그 목록 (가로 스크롤)">
        <table className="compare">
          <thead>
            <tr>
              <th scope="col">키</th>
              <th scope="col">상태</th>
              <th scope="col">설명</th>
              <th scope="col">마지막 변경</th>
              <th scope="col">변경자</th>
              <th scope="col">관리</th>
            </tr>
          </thead>
          <tbody>
            {flags.map((f) => (
              <tr key={f.key}>
                <td>
                  <code>{f.key}</code>
                </td>
                <td>{f.enabled ? '켜짐' : '꺼짐'}</td>
                <td>{f.description ?? '—'}</td>
                <td>{dt.format(new Date(f.updatedAt))}</td>
                <td>{f.updatedBy ?? '—'}</td>
                <td>
                  <AdminFeatureFlagToggle flag={f} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
