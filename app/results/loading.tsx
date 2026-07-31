import { SkeletonCard } from '../../components/Skeleton';

export default function ResultsLoading() {
  return (
    <main className="mx-auto max-w-wide px-4 pb-24 pt-6" aria-busy="true" aria-label="추천 계산 중">
      <h1 className="text-2xl font-bold text-text">추천 결과</h1>
      <p className="mt-1 text-sm text-text-sub">딱 맞는 상영관을 찾고 있어요…</p>
      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <SkeletonCard key={i} lines={4} />
        ))}
      </div>
    </main>
  );
}
