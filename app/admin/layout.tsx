import type { Metadata } from 'next';
import Link from 'next/link';
import { adminEnabled } from '../../src/lib/adminAuth';

export const metadata: Metadata = { title: '관리자' };
export const dynamic = 'force-dynamic';

// admin-scope: "The Screening Room" 사이트 전역 확장(app/globals.css)이 :root 토큰을
// 시네마 레드로 바꾸면서, 이 값들을 그대로 쓰는 관리자 화면도 함께 바뀌어 버렸다 — 그런데
// 관리자는 운영 도구고, 사용자 브랜드 경험과 의도적으로 구분해야 한다(§12). 이 클래스가
// globals.css에서 --bg·--primary 등을 원래 블루 팔레트로 지역적으로 되돌린다.
// bg-bg text-text를 반드시 같이 줘야 한다 — admin-scope는 CSS 변수만 재정의할 뿐, body가
// 이미 사이트 전역 배경·글자색을 페인트해 버린 뒤라서, 이 요소 스스로 그 변수를 실제로
// "칠하지" 않으면 명시적 색 클래스가 없는 자식(예: .card는 자체 color가 없다)은 그대로 body의
// 전역 다크 텍스트색을 상속한다 — 실제로 axe가 흰 배경 위 거의 안 보이는 글자(대비 1.17)로
// 잡아냈다.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!adminEnabled()) {
    return (
      <main className="admin-scope min-h-screen bg-bg text-text">
        <div className="card" role="alert">
          <h2 style={{ marginTop: 0 }}>관리자 기능 비활성</h2>
          <p className="sub">
            <code>ADMIN_PASSWORD</code> 환경변수가 설정되지 않아 관리자 기능이 꺼져 있습니다. 루트{' '}
            <code>.env</code>에 설정 후 서버를 재시작하세요 (docs/SECURITY.md 참고).
          </p>
        </div>
      </main>
    );
  }
  return (
    <div className="admin-scope min-h-screen bg-bg text-text">
      <nav
        aria-label="관리자 메뉴"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}
      >
        <div className="row" style={{ maxWidth: 640, margin: '0 auto', padding: '6px 16px' }}>
          <span className="badge badge-mid">관리자 모드</span>
          <Link href="/admin">대시보드</Link>
          <Link href="/admin/showtimes">회차 관리</Link>
          <Link href="/admin/showtimes/new">새 회차</Link>
          <Link href="/admin/showtimes/import">CSV 등록</Link>
          <Link href="/admin/runs">추천 추적</Link>
          <Link href="/admin/reports">제보 검토</Link>
          <Link href="/admin/quality">데이터 품질</Link>
          <Link href="/admin/booking-links">예매 링크</Link>
          <Link href="/admin/feature-flags">기능 플래그</Link>
          <Link href="/admin/data-linkage">KMDb 연결 검토</Link>
          <Link href="/admin/invite-codes">초대 코드</Link>
          <Link href="/admin/privacy-requests">개인정보 요청</Link>
          <Link href="/admin/alpha-ops">알파 운영</Link>
        </div>
      </nav>
      {children}
    </div>
  );
}
