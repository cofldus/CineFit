import { Skeleton } from '../../components/Skeleton';

export default function MoviesLoading() {
  return (
    <main className="mx-auto max-w-wide px-4 pb-24 pt-6" aria-busy="true" aria-label="영화 목록 불러오는 중">
      <h1 className="text-2xl font-bold text-text">어떤 영화를 보러 가세요?</h1>
      <p className="mt-1 text-sm text-text-sub">영화 목록을 불러오고 있어요…</p>
      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col rounded-card-lg border border-border bg-surface p-4" aria-hidden>
            <Skeleton className="aspect-[1.85/1] w-full" />
            <Skeleton className="mt-3 h-[18px] w-[70%]" />
            <Skeleton className="mt-2.5 h-3 w-[85%]" />
            <Skeleton className="mt-1.5 h-3 w-[60%]" />
          </div>
        ))}
      </div>
    </main>
  );
}
