import Link from 'next/link';
import type { MovieWithSpecs } from '../src/domain/recommendation/types';
import { formatSpecValue, keySpecEntries, SPEC_KEY_LABELS } from '../src/lib/display';
import { AspectFrame } from './ScreenArt';
import { TrustBadge } from './TrustBadge';

// 포스터 없이 실제 화면비 데이터를 시각화한 프레임 + 텍스트·태그로 성립하는 카드
// (docs/09 §1 — 저작권 미확보 전제, docs/DESIGN-SYSTEM.md §영화 카드)
export function MovieCard({ movie }: { movie: MovieWithSpecs }) {
  return (
    <article
      className="flex h-full flex-col rounded-card-lg border border-border bg-surface p-4 shadow-card transition-colors hover:border-primary/50"
      aria-labelledby={`movie-${movie.id}-title`}
    >
      <AspectFrame aspect={movie.specs.native_ar?.value ? String(movie.specs.native_ar.value) : null} className="mb-3" />
      <h3 id={`movie-${movie.id}-title`} className="m-0 text-lg font-bold text-text">
        {movie.title}
        {movie.releaseYear ? <span className="font-normal text-text-sub"> ({movie.releaseYear})</span> : null}
      </h3>
      <p className="mb-3 mt-1 text-sm text-text-sub">
        {movie.originalTitle} · {movie.runtimeMin}분 · {movie.director} · {movie.genres.join('/')}
      </p>
      <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
        {keySpecEntries(movie).map(({ key, spec }) => (
          <li key={key} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <span className="text-text-sub">{SPEC_KEY_LABELS[key]}</span>
            <strong className="font-semibold text-text">{formatSpecValue(key, spec)}</strong>
            <TrustBadge status={spec.infoStatus} observedAt={spec.observedAt} />
          </li>
        ))}
      </ul>
      <div className="mt-auto pt-4">
        <Link
          href={`/recommend/${movie.id}`}
          className="flex min-h-11 w-full items-center justify-center rounded-card bg-primary px-5 text-[15px] font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          이 영화로 추천받기
        </Link>
      </div>
    </article>
  );
}
