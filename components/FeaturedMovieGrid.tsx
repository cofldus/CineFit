import { FORMAT_LABELS } from '../src/domain/recommendation/presets';
import type { MovieWithSpecs } from '../src/domain/recommendation/types';
import { keySpecEntries } from '../src/lib/display';
import { MovieFrame, type MovieFrameVariant } from './MovieFrame';
import { TrackedLink } from './TrackedLink';

function topFormats(movie: MovieWithSpecs, max: number): string[] {
  const raw = movie.specs.format_versions?.value;
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, max).map((v) => FORMAT_LABELS[String(v)] ?? String(v));
}

function verificationNote(movie: MovieWithSpecs): string {
  const entries = keySpecEntries(movie);
  if (entries.length === 0) return '데이터 확인 중';
  const verified = entries.filter((e) => e.spec.infoStatus === 'official' || e.spec.infoStatus === 'multi_source').length;
  return verified === entries.length ? '사양 출처 확인됨' : '일부 사양 확인 중';
}

/**
 * "지금 볼 수 있는 영화" — 세 타일이 같은 카드 컴포넌트의 반복으로 보이지 않도록 서로 다른
 * 구성 원리를 준다: 첫 작품(lead)은 프레임과 텍스트가 좌우로 나란한 넓은 타일, 두 번째
 * (overlay)는 캡션이 프레임 위에 얹히는 잡지 컷라인 방식, 세 번째부터(plain)는 프레임-위/
 * 텍스트-아래 기본형. 포맷 배지는 최대 2개, 확인 상태는 색 배지 없이 보조 텍스트로만 둔다.
 * 밝은 중성 섹션이라 어두운 히어로·매니페스토와 리듬을 이룬다.
 */
export function FeaturedMovieGrid({ movies }: { movies: MovieWithSpecs[] }) {
  if (movies.length === 0) return null;
  const [lead, ...rest] = movies;

  return (
    <section className="bg-home-light py-16 lg:py-24">
      <div className="mx-auto max-w-[1360px] px-5 sm:px-8 lg:px-16">
        <div className="flex items-end justify-between gap-4">
          <h2 className="font-wanted text-2xl font-bold tracking-[-0.03em] text-home-light-ink sm:text-4xl">
            지금 볼 수 있는 영화
          </h2>
          <span className="font-wanted text-xs text-home-light-ink-muted">{movies.length}편</span>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
          <LeadCard movie={lead} />
          {rest.length > 0 && (
            <div className="flex flex-col gap-6 lg:col-span-5 lg:gap-8">
              {rest.map((m, i) => (
                <FeaturedCard key={m.id} movie={m} variant={i === 0 ? 'overlay' : 'plain'} />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function LeadCard({ movie }: { movie: MovieWithSpecs }) {
  const nativeAr = movie.specs.native_ar?.value ? String(movie.specs.native_ar.value) : null;
  const formats = topFormats(movie, 2);

  return (
    <TrackedLink
      event="movie_selected"
      eventProperties={{ movieId: movie.id }}
      href={`/recommend/${movie.id}`}
      className="group flex flex-col bg-home-light-raised transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-[0_20px_48px_rgba(18,21,28,0.14)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-home-brand lg:col-span-7 lg:flex-row lg:items-stretch"
    >
      <MovieFrame aspect={nativeAr} variant="lead" className="lg:w-3/5" />
      <div className="flex flex-col justify-center p-6 lg:w-2/5 lg:p-8">
        <h3 className="m-0 font-wanted text-2xl font-bold tracking-[-0.03em] text-home-light-ink sm:text-3xl">
          {movie.title}
          {movie.releaseYear ? (
            <span className="font-normal text-home-light-ink-muted"> ({movie.releaseYear})</span>
          ) : null}
        </h3>
        <div className="mt-3 flex flex-wrap items-center gap-2 font-wanted text-xs text-home-light-ink-muted">
          {nativeAr ? <span>{nativeAr}:1</span> : null}
          {formats.map((f) => (
            <span key={f}>· {f}</span>
          ))}
        </div>
        <p className="mt-2 text-xs text-home-light-ink-muted">{verificationNote(movie)}</p>
        <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-home-brand group-hover:underline">
          추천받기 →
        </span>
      </div>
    </TrackedLink>
  );
}

function FeaturedCard({ movie, variant }: { movie: MovieWithSpecs; variant: MovieFrameVariant }) {
  const nativeAr = movie.specs.native_ar?.value ? String(movie.specs.native_ar.value) : null;
  const formats = topFormats(movie, 2);

  return (
    <TrackedLink
      event="movie_selected"
      eventProperties={{ movieId: movie.id }}
      href={`/recommend/${movie.id}`}
      className="group block bg-home-light-raised transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(18,21,28,0.12)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-home-brand"
    >
      {variant === 'overlay' ? (
        <div className="relative">
          <MovieFrame aspect={nativeAr} variant="overlay" />
          <div className="absolute inset-x-0 bottom-0 p-4">
            <h3 className="m-0 font-wanted text-lg font-bold tracking-[-0.03em] text-white">
              {movie.title}
              {movie.releaseYear ? <span className="font-normal text-white/70"> ({movie.releaseYear})</span> : null}
            </h3>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 font-wanted text-xs text-white/70">
              {nativeAr ? <span>{nativeAr}:1</span> : null}
              {formats.map((f) => (
                <span key={f}>· {f}</span>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <MovieFrame aspect={nativeAr} variant="plain" className="max-h-40" />
      )}
      <div className="p-4">
        {variant !== 'overlay' && (
          <h3 className="m-0 font-wanted text-base font-bold tracking-[-0.03em] text-home-light-ink">
            {movie.title}
            {movie.releaseYear ? (
              <span className="font-normal text-home-light-ink-muted"> ({movie.releaseYear})</span>
            ) : null}
          </h3>
        )}
        {variant !== 'overlay' && (
          <div className="mt-2 flex flex-wrap items-center gap-2 font-wanted text-xs text-home-light-ink-muted">
            {nativeAr ? <span>{nativeAr}:1</span> : null}
            {formats.map((f) => (
              <span key={f}>· {f}</span>
            ))}
          </div>
        )}
        <p className="mt-2 text-xs text-home-light-ink-muted">{verificationNote(movie)}</p>
        <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-home-brand group-hover:underline">
          추천받기 →
        </span>
      </div>
    </TrackedLink>
  );
}
