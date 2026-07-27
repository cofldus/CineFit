'use client';

// 내부 오류 내용을 그대로 노출하지 않는 공통 오류 화면
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>문제가 발생했습니다</h2>
        <p className="sub">
          일시적인 오류일 수 있습니다. DB가 준비되지 않았다면 <code>npm run db:seed</code>를 먼저
          실행해 주세요.
        </p>
        <button className="btn btn-primary" onClick={() => reset()}>
          다시 시도
        </button>
      </div>
    </main>
  );
}
