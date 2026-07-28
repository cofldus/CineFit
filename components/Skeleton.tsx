// 공용 로딩 스켈레톤 — 항상 부모의 aria-busy/aria-label과 함께 쓰고, 장식 요소이므로
// 각 조각은 aria-hidden 처리한다 (실제 안내 문구는 페이지의 <p> 텍스트가 담당).
export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-md bg-border ${className}`} />;
}

export function SkeletonCard({ lines = 3, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={`rounded-card-lg border border-border bg-surface p-4 ${className}`} aria-hidden>
      <Skeleton className="h-[18px] w-[55%]" />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={`mt-2.5 h-3 ${i === lines - 1 ? 'w-[60%]' : 'w-[80%]'}`} />
      ))}
    </div>
  );
}
