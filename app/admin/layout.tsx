import type { Metadata } from 'next';
import Link from 'next/link';
import { adminEnabled } from '../../src/lib/adminAuth';

export const metadata: Metadata = { title: '관리자' };
export const dynamic = 'force-dynamic';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!adminEnabled()) {
    return (
      <main>
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
    <>
      <nav
        aria-label="관리자 메뉴"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}
      >
        <div className="row" style={{ maxWidth: 640, margin: '0 auto', padding: '6px 16px' }}>
          <span className="badge badge-mid">관리자 모드</span>
          <Link href="/admin">대시보드</Link>
          <Link href="/admin/showtimes">회차 관리</Link>
          <Link href="/admin/showtimes/new">새 회차</Link>
          <Link href="/admin/reports">제보 검토</Link>
          <Link href="/admin/quality">데이터 품질</Link>
          <Link href="/admin/booking-links">예매 링크</Link>
          <Link href="/admin/feature-flags">기능 플래그</Link>
        </div>
      </nav>
      {children}
    </>
  );
}
