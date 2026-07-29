import { redirect } from 'next/navigation';
import { alphaOpsRepository } from '../../../src/data/alphaOpsRepository';
import { isAdminAuthed } from '../../../src/lib/adminAuthServer';

export default async function AdminAlphaOpsPage() {
  if (!(await isAdminAuthed())) redirect('/admin/login');
  const summary = await alphaOpsRepository.getSummary();

  return (
    <main>
      <h1>알파 운영 대시보드</h1>
      <p className="sub">
        docs/ANALYTICS.md · docs/PRIVATE-ALPHA.md — 원시 이벤트를 직접 SQL로 조회하지 않아도
        되도록 초대·동의 현황과 사용 퍼널을 한 화면에 모았습니다.
      </p>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>초대 코드 현황</h2>
        <ul className="plain">
          <li>
            발급된 코드: <strong>{summary.inviteCodes.totalCodes}</strong>개 (활성{' '}
            <strong>{summary.inviteCodes.activeCodes}</strong>개)
          </li>
          <li>
            코드 사용(redemption) 총 건수: <strong>{summary.inviteCodes.totalRedemptions}</strong>건
          </li>
          <li>
            코드를 사용한 고유 세션: <strong>{summary.inviteCodes.distinctRedeemedSessions}</strong>명
          </li>
        </ul>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>세션·동의 현황</h2>
        <ul className="plain">
          <li>
            전체 세션: <strong>{summary.consent.totalSessions}</strong>개
          </li>
          <li>
            참여 동의(alpha_consents) 완료: <strong>{summary.consent.consentedSessions}</strong>개 — 전체 세션 대비{' '}
            <strong>{summary.consent.consentRatePercent}%</strong>
          </li>
        </ul>
        <p className="sub">
          비공개 알파 게이트(private_alpha_gate)가 꺼져 있는 동안은 동의 없이도 앱을 쓸 수 있어
          이 비율이 낮게 나오는 게 정상입니다 — 게이트를 켠 뒤의 추이를 봐야 의미가 있습니다.
        </p>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>사용 퍼널</h2>
        <p className="sub">각 단계 이벤트를 한 번이라도 기록한 고유 세션 수 — "앱 열림" 대비 도달률입니다.</p>
        <div className="table-scroll" tabIndex={0} role="region" aria-label="사용 퍼널 (가로 스크롤)">
          <table className="compare">
            <thead>
              <tr>
                <th scope="col">단계</th>
                <th scope="col">세션 수</th>
                <th scope="col">도달률</th>
              </tr>
            </thead>
            <tbody>
              {summary.funnel.map((stage) => (
                <tr key={stage.key}>
                  <td>{stage.label}</td>
                  <td>{stage.sessionCount}</td>
                  <td>{stage.percentOfFirst}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
