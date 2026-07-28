import { Skeleton } from '../../../components/Skeleton';

export default function CinemaDetailLoading() {
  return (
    <main className="mx-auto max-w-wide px-4 pb-24 pt-6" aria-busy="true" aria-label="상영관 정보 불러오는 중">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-2 h-7 w-64" />
      <Skeleton className="mt-3 h-6 w-40" />
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {[1, 2].map((i) => (
          <div key={i} aria-hidden>
            <Skeleton className="h-[18px] w-32" />
            <div className="mt-3 rounded-card-lg border border-border bg-surface p-4">
              <Skeleton className="h-3 w-[80%]" />
              <Skeleton className="mt-2.5 h-3 w-[70%]" />
              <Skeleton className="mt-2.5 h-3 w-[60%]" />
              <Skeleton className="mt-2.5 h-3 w-[75%]" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
