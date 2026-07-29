import type { MovieWithSpecs } from '../src/domain/recommendation/types';
import { formatSpecValue, keySpecEntries, SPEC_KEY_LABELS } from '../src/lib/display';
import { AspectFrame } from './ScreenArt';
import { TrackedLink } from './TrackedLink';
import { TrustBadge } from './TrustBadge';
import { TrustDetails } from './TrustDetails';
import { TrustSummary } from './TrustSummary';

function topFormats(movie: MovieWithSpecs, max: number): string[] {
  const raw = movie.specs.format_versions?.value;
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, max).map(String);
}

/**
 * 영화 카드 — 기본 표시는 화면비·제목·핵심 포맷 최대 몇 개·신뢰도 요약뿐이다(§7). 전체 사양
 * 목록(예전 MovieCard가 항상 펼쳐 보여주던 것)은 TrustDetails 뒤로 옮겼다.
 * variant='compact': 홈 영화 레일용(사양 상세 없음). variant='grid': /movies 그리드용(전체).
 */
export function EditorialMovieCard({
  movie,
  variant = 'grid',
}: {
  movie: MovieWithSpecs;
  variant?: 'grid' | 'compact';
}) {
  const specEntries = keySpecEntries(movie);
  const nativeAr = movie.specs.native_ar?.value ? String(movie.specs.native_ar.value) : null;
  const formats = topFormats(movie, variant === 'compact' ? 2 : 3);
  const statuses = specEntries.map((e) => e.spec.infoStatus);
  const isCompact = variant === 'compact';

  return (
    <article
      className={`group flex h-full flex-col border border-ed-hairline bg-ed-surface ${isCompact ? 'p-3' : 'p-4'}`}
      aria-labelledby={`movie-${movie.id}-title`}
    >
      <AspectFrame aspect={nativeAr} className="mb-3" />
      <h3
        id={`movie-${movie.id}-title`}
        className={`m-0 font-display font-bold tracking-[-0.03em] text-ed-ink ${isCompact ? 'text-base' : 'text-lg'}`}
      >
        {movie.title}
        {movie.releaseYear ? <span className="font-normal text-ed-ink-muted"> ({movie.releaseYear})</span> : null}
      </h3>
      {!isCompact && (
        <p className="mb-2 mt-1 font-label text-xs text-ed-ink-muted">
          {movie.originalTitle} · {movie.runtimeMin}분 · {movie.genres.join('/')}
        </p>
      )}
      {formats.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {formats.map((f) => (
            <span
              key={f}
              className="border border-ed-hairline px-1.5 py-0.5 font-label text-[10px] font-medium uppercase tracking-[0.1em] text-ed-ink-muted"
            >
              {f}
            </span>
          ))}
        </div>
      )}
      <div className="mt-2">
        <TrustSummary statuses={statuses} />
      </div>
      {!isCompact && specEntries.length > 0 && (
        <TrustDetails summaryLabel="사양 상세 보기">
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
            {specEntries.map(({ key, spec }) => (
              <li key={key} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ed-ink">
                <span className="text-ed-ink-muted">{SPEC_KEY_LABELS[key]}</span>
                <strong className="font-semibold">{formatSpecValue(key, spec)}</strong>
                <TrustBadge status={spec.infoStatus} observedAt={spec.observedAt} />
              </li>
            ))}
          </ul>
        </TrustDetails>
      )}
      <div className="mt-auto pt-4">
        <TrackedLink
          event="movie_selected"
          eventProperties={{ movieId: movie.id }}
          href={`/recommend/${movie.id}`}
          className="flex min-h-11 w-full items-center justify-center border border-ed-ink bg-ed-ink px-5 text-[15px] font-semibold text-ed-canvas transition-opacity hover:opacity-85"
        >
          이 영화로 추천받기
        </TrackedLink>
      </div>
    </article>
  );
}
