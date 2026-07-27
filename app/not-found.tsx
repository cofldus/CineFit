import Link from 'next/link';

export default function NotFound() {
  return (
    <main>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>페이지를 찾을 수 없습니다</h2>
        <p className="sub">주소가 잘못되었거나, 요청한 영화·데이터가 없습니다.</p>
        <Link href="/" className="btn btn-primary">
          홈으로
        </Link>
      </div>
    </main>
  );
}
