import Link from 'next/link';
import type { MovieWithSpecs } from '../src/domain/recommendation/types';
import { formatSpecValue, keySpecEntries, SPEC_KEY_LABELS } from '../src/lib/display';
import { TrustBadge } from './TrustBadge';

// 포스터 없이 텍스트·태그만으로 성립하는 카드 (docs/09 §1 — 저작권 미확보 전제)
export function MovieCard({ movie }: { movie: MovieWithSpecs }) {
  return (
    <article className="card" aria-labelledby={`movie-${movie.id}-title`}>
      <h3 id={`movie-${movie.id}-title`} style={{ marginTop: 0, marginBottom: 4 }}>
        {movie.title}
        {movie.releaseYear ? <span className="sub"> ({movie.releaseYear})</span> : null}
      </h3>
      <p className="sub" style={{ margin: '0 0 8px' }}>
        {movie.originalTitle} · {movie.runtimeMin}분 · {movie.director} · {movie.genres.join('/')}
      </p>
      <ul className="plain" style={{ fontSize: 14 }}>
        {keySpecEntries(movie).map(({ key, spec }) => (
          <li key={key} className="row">
            <span className="sub">{SPEC_KEY_LABELS[key]}</span>
            <strong>{formatSpecValue(key, spec)}</strong>
            <TrustBadge status={spec.infoStatus} observedAt={spec.observedAt} />
          </li>
        ))}
      </ul>
      <Link href={`/recommend/${movie.id}`} className="btn btn-primary btn-block">
        이 영화로 추천받기
      </Link>
    </article>
  );
}
