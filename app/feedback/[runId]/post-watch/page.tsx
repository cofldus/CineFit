import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PostWatchForm } from '../../../../components/PostWatchForm';
import { movieRepository } from '../../../../src/data/movieRepository';
import { recommendationRepository } from '../../../../src/data/recommendationRepository';

export const metadata: Metadata = { title: '관람 후 평가' };
export const dynamic = 'force-dynamic';

export default async function PostWatchPage({ params }: { params: Promise<{ runId: string }> }) {
  const runId = Number((await params).runId);
  const summary = Number.isInteger(runId) ? await recommendationRepository.getRunSummary(runId) : null;
  if (!summary) notFound();

  const movie = await movieRepository.findById(summary.movieId);

  return (
    <main className="mx-auto max-w-xl px-4 pb-24 pt-6">
      <h1 className="text-2xl font-extrabold text-text">관람은 어떠셨나요?</h1>
      {movie ? (
        <p className="mt-1 text-sm text-text-sub">
          <strong className="font-semibold text-text">{movie.title}</strong> 추천에 대한 평가예요.
        </p>
      ) : null}
      <p className="mt-3 text-sm text-text-sub">
        아직 관람 전이라면 상영 시작 후에 다시 와서 남겨주세요 — 관람 전 평가는 저장되지 않아요.
      </p>
      <div className="mt-5">
        <PostWatchForm runId={runId} />
      </div>
    </main>
  );
}
