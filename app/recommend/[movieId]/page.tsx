import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { RecommendForm } from '../../../components/RecommendForm';
import { TrustBadge } from '../../../components/TrustBadge';
import { DEMO_DATE } from '../../../src/data/constants';
import { movieRepository } from '../../../src/data/movieRepository';
import { showtimeRepository } from '../../../src/data/showtimeRepository';
import { formatSpecValue, keySpecEntries, SPEC_KEY_LABELS } from '../../../src/lib/display';

export const metadata: Metadata = { title: '추천 조건 입력' };
export const dynamic = 'force-dynamic';

export default async function RecommendPage({ params }: { params: Promise<{ movieId: string }> }) {
  const { movieId } = await params;
  const id = Number(movieId);
  const movie = Number.isInteger(id) ? movieRepository.findById(id) : null;
  if (!movie) notFound();

  // 기본 관람 날짜: 오늘(Asia/Seoul) 이후 활성 회차가 있는 가장 가까운 날짜, 없으면 데모 날짜
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
  const dates = showtimeRepository.listActiveDates(movie.id);
  const defaultDate = dates.find((d) => d >= today) ?? dates.at(-1) ?? DEMO_DATE;

  return (
    <main>
      <h1>추천 조건</h1>
      <section className="card" aria-label="선택한 영화">
        <h3 style={{ marginTop: 0 }}>
          {movie.title} <span className="sub">({movie.releaseYear})</span>
        </h3>
        <ul className="plain" style={{ fontSize: 14 }}>
          {keySpecEntries(movie).map(({ key, spec }) => (
            <li key={key} className="row">
              <span className="sub">{SPEC_KEY_LABELS[key]}</span>
              <strong>{formatSpecValue(key, spec)}</strong>
              <TrustBadge status={spec.infoStatus} observedAt={spec.observedAt} />
            </li>
          ))}
        </ul>
      </section>
      <RecommendForm movieId={movie.id} defaultDate={defaultDate} />
    </main>
  );
}
