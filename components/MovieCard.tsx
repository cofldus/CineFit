import { FORMAT_LABELS } from '../src/domain/recommendation/presets';
import type { MovieWithSpecs } from '../src/domain/recommendation/types';
import { formatSpecValue, keySpecEntries, SPEC_KEY_LABELS } from '../src/lib/display';
import { IconArrowRight } from './Icon';
import { AspectFrame } from './ScreenArt';
import { TrackedLink } from './TrackedLink';
import { TrustBadge } from './TrustBadge';

const RATIO_MIN = 1.85;
const RATIO_MAX = 2.39;

function topFormats(movie: MovieWithSpecs, max: number): string[] {
  const raw = movie.specs.format_versions?.value;
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, max).map((v) => FORMAT_LABELS[String(v)] ?? String(v));
}

function verificationSummary(movie: MovieWithSpecs): string {
  const entries = keySpecEntries(movie);
  if (entries.length === 0) return '확인 중';
  const verified = entries.filter((e) => e.spec.infoStatus === 'official' || e.spec.infoStatus === 'multi_source').length;
  return verified === entries.length ? '확인됨' : '일부 추정';
}

/**
 * 영화 카드 — variant="detailed"(기본, /movies 목록)와 variant="compact"(홈 "지금 볼 수
 * 있는 영화" 가로 스크롤)를 하나의 컴포넌트로 통합했다. compact는 "카드마다 큰 이미지이
 * 필요하다"는 전제에서 벗어나 실제 화면비를 얇은 막대 하나로만 표시하고, 제목·연도·러닝타임·
 * 포맷·검증 요약 한 줄로 정보를 압축한다 — 포스터 없는 데이터를 "깨진 이미지"가 아니라
 * 타이포그래피 중심 카드로 보여주는 의도된 설계다.
 */
export function MovieCard({ movie, variant = 'detailed' }: { movie: MovieWithSpecs; variant?: 'detailed' | 'compact' }) {
  if (variant === 'compact') {
    const nativeAr = movie.specs.native_ar?.value ? Number(movie.specs.native_ar.value) : null;
    const ratioLabel = nativeAr ? `${nativeAr.toFixed(2)}:1` : null;
    const clampedAr = Math.min(RATIO_MAX, Math.max(RATIO_MIN, nativeAr ?? 1.85));
    const formats = topFormats(movie, 2);

    return (
      <TrackedLink
        event="movie_selected"
        eventProperties={{ movieId: movie.id }}
        href={`/recommend/${movie.id}`}
        className="group block w-[85%] shrink-0 snap-start rounded-card-lg border border-border bg-surface p-4 transition-all duration-200 hover:-translate-y-[3px] hover:shadow-float focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-strong active:translate-y-0 sm:w-auto"
      >
        {/* 영화마다 실제 화면비로 프레임 자체의 모양이 달라진다(2.39:1은 낮고 넓게, 1.85:1은
            상대적으로 높게) — 그 위에 비율 숫자를 크게 얹어 "이 영화의 스크린 모양"임을
            바로 읽히게 한다. 회색 빈 상자 대신 화면비 자체가 카드의 정체성이 되게 하는
            의도다(장식이 아니라 데이터 표현). */}
        <div
          aria-hidden
          className="flex items-center justify-center rounded-card border border-hero-border bg-hero transition-shadow group-hover:shadow-glow-primary"
          style={{ aspectRatio: `${clampedAr} / 1` }}
        >
          <span className="font-mono text-lg font-bold text-hero-text sm:text-xl">
            {ratioLabel ?? `${clampedAr.toFixed(2)}:1`}
          </span>
        </div>
        <h3 className="font-wanted m-0 mt-4 line-clamp-2 text-lg font-bold tracking-[-0.01em] text-text">
          {movie.title}
        </h3>
        <p className="m-0 mt-1 text-[15px] font-medium text-text-sub">
          {movie.releaseYear ? `${movie.releaseYear} · ` : ''}
          {movie.runtimeMin}분{formats.length > 0 ? ` · ${formats.join(' · ')}` : ''}
        </p>
        <p className="m-0 mt-3 flex items-center justify-between gap-2 border-t border-border pt-3 text-[13.5px] font-medium text-text-sub">
          상영 정보 {verificationSummary(movie)}
          <IconArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1" />
        </p>
      </TrackedLink>
    );
  }

  return (
    <article
      className="flex h-full flex-col rounded-card-lg border border-border bg-surface p-4 transition-all duration-200 hover:-translate-y-1 hover:border-border-strong hover:bg-surface-raised hover:shadow-float"
      aria-labelledby={`movie-${movie.id}-title`}
    >
      <AspectFrame aspect={movie.specs.native_ar?.value ? String(movie.specs.native_ar.value) : null} className="mb-3" />
      <h3 id={`movie-${movie.id}-title`} className="font-wanted m-0 text-lg font-bold tracking-[-0.01em] text-text">
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
        <TrackedLink
          event="movie_selected"
          eventProperties={{ movieId: movie.id }}
          href={`/recommend/${movie.id}`}
          className="flex min-h-11 w-full items-center justify-center rounded-card bg-primary-strong px-5 text-[15px] font-semibold text-white transition-all hover:bg-primary-strong-hover active:scale-[0.98]"
        >
          이 영화로 추천받기
        </TrackedLink>
      </div>
    </article>
  );
}
