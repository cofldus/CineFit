export default function ResultsLoading() {
  return (
    <main aria-busy="true" aria-label="추천 계산 중">
      <h1>추천 결과</h1>
      <p className="sub">추천을 계산하고 있습니다…</p>
      {[1, 2, 3].map((i) => (
        <div key={i} className="card" aria-hidden>
          <div style={{ height: 18, width: '55%', background: 'var(--border)', borderRadius: 6 }} />
          <div style={{ height: 12, width: '80%', background: 'var(--border)', borderRadius: 6, marginTop: 10 }} />
          <div style={{ height: 12, width: '70%', background: 'var(--border)', borderRadius: 6, marginTop: 6 }} />
        </div>
      ))}
    </main>
  );
}
