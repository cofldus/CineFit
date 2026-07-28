import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { RecommendForm } from '../../../components/RecommendForm';
import { TrustBadge } from '../../../components/TrustBadge';
import { DEMO_DATE } from '../../../src/data/constants';
import { getAppClock, seoulDateString } from '../../../src/lib/clock';
import { movieRepository } from '../../../src/data/movieRepository';
import { showtimeRepository } from '../../../src/data/showtimeRepository';
import { formatSpecValue, keySpecEntries, SPEC_KEY_LABELS } from '../../../src/lib/display';

export const metadata: Metadata = { title: '추천 조건 입력' };
export const dynamic = 'force-dynamic';

export default async function RecommendPage({ params }: { params: Promise<{ movieId: string }> }) {
  const { movieId } = await params;
  const id = Number(movieId);
  const movie = Number.isInteger(id) ? await movieRepository.findById(id) : null;
  if (!movie) notFound();

  // 기본 관람 날짜: 오늘(Asia/Seoul) 이후 활성 회차가 있는 가장 가까운 날짜, 없으면 데모 날짜
  const today = seoulDateString(getAppClock().now());
  const dates = await showtimeRepository.listActiveDates(movie.id);
  const defaultDate = dates.find((d) => d >= today) ?? dates.at(-1) ?? DEMO_DATE;

  return (
    <main className="mx-auto max-w-xl px-4 pb-24 pt-6">
      <h1 className="text-2xl font-extrabold text-text">어떤 조건을 원하세요?</h1>
      <p className="mt-1 text-sm text-text-sub">아래 조건에 맞는 상영관을 찾아드릴게요.</p>

      <section className="mt-4 rounded-card-lg border border-border bg-surface p-4" aria-label="선택한 영화">
        <h3 className="m-0 text-lg font-bold text-text">
          {movie.title} <span className="font-normal text-text-sub">({movie.releaseYear})</span>
        </h3>
        <ul className="m-0 mt-2 flex list-none flex-col gap-1.5 p-0">
          {keySpecEntries(movie).map(({ key, spec }) => (
            <li key={key} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              <span className="text-text-sub">{SPEC_KEY_LABELS[key]}</span>
              <strong className="font-semibold text-text">{formatSpecValue(key, spec)}</strong>
              <TrustBadge status={spec.infoStatus} observedAt={spec.observedAt} />
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-5">
        <RecommendForm movieId={movie.id} defaultDate={defaultDate} />
      </div>
    </main>
  );
}
