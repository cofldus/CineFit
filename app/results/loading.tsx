export default function ResultsLoading() {
  return (
    <main className="mx-auto max-w-xl px-4 pb-24 pt-6" aria-busy="true" aria-label="추천 계산 중">
      <h1 className="text-2xl font-extrabold text-text">추천 결과</h1>
      <p className="mt-1 text-sm text-text-sub">딱 맞는 상영관을 찾고 있어요…</p>
      <div className="mt-5 flex flex-col gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse rounded-card-lg border border-border bg-surface p-4" aria-hidden>
            <div className="h-[18px] w-[55%] rounded-md bg-border" />
            <div className="mt-2.5 h-3 w-[80%] rounded-md bg-border" />
            <div className="mt-1.5 h-3 w-[70%] rounded-md bg-border" />
          </div>
        ))}
      </div>
    </main>
  );
}
