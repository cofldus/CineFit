import Link from 'next/link';
import { FORMAT_LABELS } from '../src/domain/recommendation/presets';
import type { MovieWithSpecs } from '../src/domain/recommendation/types';
import { keySpecEntries } from '../src/lib/display';
import { MovieFrame } from './MovieFrame';
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
 * Now showing — 첫 영화는 넓게, 나머지는 작게(비대칭 editorial grid). 카드 전체가 클릭
 * 가능한 하나의 링크이고, 포맷 배지는 최대 2개, 확인 상태는 색 배지 없이 작은 보조
 * 텍스트로만 둔다(§4-C). 밝은 중성 섹션이라 어두운 홈 히어로와 리듬을 이룬다.
 */
export function FeaturedMovieGrid({ movies }: { movies: MovieWithSpecs[] }) {
  if (movies.length === 0) return null;
  const [first, ...rest] = movies;

  return (
    <section className="bg-home-light py-16">
      <div className="mx-auto max-w-[1360px] px-5 sm:px-8">
        <div className="flex items-end justify-between gap-4">
          <h2 className="font-display text-2xl font-bold tracking-[-0.03em] text-home-light-ink sm:text-3xl">
            지금 볼 수 있는 영화
          </h2>
          <span className="font-label text-xs text-home-light-ink-muted">{movies.length}편</span>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <FeaturedCard movie={first} large />
          {rest.length > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1">
              {rest.map((m) => (
                <FeaturedCard key={m.id} movie={m} />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function FeaturedCard({ movie, large = false }: { movie: MovieWithSpecs; large?: boolean }) {
  const nativeAr = movie.specs.native_ar?.value ? String(movie.specs.native_ar.value) : null;
  const formats = topFormats(movie, 2);

  return (
    <TrackedLink
      event="movie_selected"
      eventProperties={{ movieId: movie.id }}
      href={`/recommend/${movie.id}`}
      className="group block bg-home-light-raised transition-shadow hover:shadow-[0_16px_40px_rgba(18,21,28,0.12)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-home-brand"
    >
      <MovieFrame aspect={nativeAr} className={large ? '' : 'max-h-40'} />
      <div className={large ? 'p-5' : 'p-4'}>
        <h3
          className={`m-0 font-display font-bold tracking-[-0.03em] text-home-light-ink ${large ? 'text-xl' : 'text-base'}`}
        >
          {movie.title}
          {movie.releaseYear ? (
            <span className="font-normal text-home-light-ink-muted"> ({movie.releaseYear})</span>
          ) : null}
        </h3>
        <div className="mt-2 flex flex-wrap items-center gap-2 font-label text-xs text-home-light-ink-muted">
          {nativeAr ? <span>{nativeAr}:1</span> : null}
          {formats.map((f) => (
            <span key={f}>· {f}</span>
          ))}
        </div>
        <p className="mt-2 text-xs text-home-light-ink-muted">{verificationNote(movie)}</p>
        <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-home-brand group-hover:underline">
          추천받기 →
        </span>
      </div>
    </TrackedLink>
  );
}
