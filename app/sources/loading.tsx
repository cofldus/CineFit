import { Skeleton } from '../../components/Skeleton';

export default function SourcesLoading() {
  return (
    <main className="mx-auto max-w-content px-4 pb-24 pt-6" aria-busy="true" aria-label="출처 정보 불러오는 중">
      <h1 className="text-2xl font-extrabold text-text">정보 출처·신뢰도 기준</h1>
      <Skeleton className="mt-3 h-4 w-[90%]" />
      <Skeleton className="mt-1.5 h-4 w-[70%]" />
      <div className="mt-7 flex flex-col gap-2" aria-hidden>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-card-lg border border-border bg-surface p-4">
            <Skeleton className="h-4 w-[40%]" />
            <Skeleton className="mt-2 h-3 w-[60%]" />
          </div>
        ))}
      </div>
    </main>
  );
}
