import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: '오프라인' };

// 서비스워커가 캐시하는 정적 안내 화면 — DB 접근 없음
export default function OfflinePage() {
  return (
    <main>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>오프라인 상태입니다</h2>
        <p className="sub">
          네트워크 연결이 없어 추천을 계산할 수 없습니다. CineFit의 추천은 데이터 신뢰도·확인일이
          핵심이라, 오래된 캐시 결과를 대신 보여드리지 않습니다.
        </p>
        <p className="sub">연결이 복구되면 아래 버튼으로 다시 시작하세요.</p>
        <Link href="/" className="btn btn-primary">
          홈으로
        </Link>
      </div>
    </main>
  );
}
