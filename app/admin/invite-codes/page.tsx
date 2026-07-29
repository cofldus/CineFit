import { redirect } from 'next/navigation';
import { AdminInviteCodeCreateForm, AdminInviteCodeToggle } from '../../../components/AdminInviteCodeForm';
import { listInviteCodes } from '../../../src/data/inviteCodeService';
import { isAdminAuthed } from '../../../src/lib/adminAuthServer';

const dt = new Intl.DateTimeFormat('ko-KR', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'Asia/Seoul',
});

export default async function AdminInviteCodesPage() {
  if (!(await isAdminAuthed())) redirect('/admin/login');
  const codes = await listInviteCodes();

  return (
    <main>
      <h1>초대 코드</h1>
      <p className="sub">
        비공개 알파 게이트(<code>private_alpha_gate</code> 기능 플래그)가 켜져 있을 때만 실제로
        강제됩니다 — <a href="/admin/feature-flags">기능 플래그</a>에서 확인하세요.
      </p>
      <AdminInviteCodeCreateForm />

      <div className="table-scroll" tabIndex={0} role="region" aria-label="초대 코드 목록 (가로 스크롤)">
        <table className="compare">
          <thead>
            <tr>
              <th scope="col">코드</th>
              <th scope="col">설명</th>
              <th scope="col">사용</th>
              <th scope="col">만료일</th>
              <th scope="col">상태</th>
              <th scope="col">생성</th>
              <th scope="col">관리</th>
            </tr>
          </thead>
          <tbody>
            {codes.map((c) => (
              <tr key={c.id}>
                <td>
                  <code>{c.code}</code>
                </td>
                <td>{c.description ?? '—'}</td>
                <td>
                  {c.useCount} / {c.maxUses ?? '무제한'}
                </td>
                <td>{c.expiresAt ?? '없음'}</td>
                <td>{c.active ? '활성' : '비활성'}</td>
                <td>{dt.format(new Date(c.createdAt))}</td>
                <td>
                  <AdminInviteCodeToggle inviteCode={c} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
