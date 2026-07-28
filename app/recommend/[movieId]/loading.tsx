import { Skeleton } from '../../../components/Skeleton';

export default function RecommendLoading() {
  return (
    <main className="mx-auto max-w-xl px-4 pb-24 pt-6" aria-busy="true" aria-label="영화 정보 불러오는 중">
      <h1 className="text-2xl font-extrabold text-text">어떤 조건을 원하세요?</h1>
      <p className="mt-1 text-sm text-text-sub">아래 조건에 맞는 상영관을 찾아드릴게요.</p>
      <div className="mt-4 rounded-card-lg border border-border bg-surface p-4" aria-hidden>
        <Skeleton className="h-[18px] w-[50%]" />
        <Skeleton className="mt-2.5 h-3 w-[70%]" />
        <Skeleton className="mt-1.5 h-3 w-[60%]" />
      </div>
      <div className="mt-5 flex flex-col gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-card-lg border border-border bg-surface p-4" aria-hidden>
            <Skeleton className="h-[15px] w-[40%]" />
            <Skeleton className="mt-3 h-11 w-full" />
            <Skeleton className="mt-2.5 h-11 w-full" />
          </div>
        ))}
      </div>
    </main>
  );
}
