import { FORMAT_LABELS } from '../src/domain/recommendation/presets';
import type { MovieWithSpecs } from '../src/domain/recommendation/types';
import { formatSpecValue, keySpecEntries, SPEC_KEY_LABELS } from '../src/lib/display';
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
        className="group block w-[220px] shrink-0 snap-start rounded-lg border border-border bg-surface p-4 transition-all duration-200 hover:-translate-y-1 hover:border-border-strong hover:bg-surface-raised hover:shadow-float focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-strong active:translate-y-0 sm:w-auto"
      >
        {/* 화면비를 실제 프레임 모양으로 시각화 — 이전의 채움 막대는 "로딩 진행률"처럼
            읽혀서 무슨 뜻인지 알기 어렵다는 피드백이 있었다. 이 사각형 자체가 화면비를
            나타내는 도형이라 의미가 바로 드러난다(장식이 아니라 데이터 표현). */}
        <div
          aria-hidden
          className="flex items-center justify-center rounded-[3px] border border-accent/50 bg-bg"
          style={{ height: '28px', width: 'auto', aspectRatio: `${clampedAr} / 1` }}
        />
        <h3 className="font-wanted m-0 mt-3 line-clamp-2 text-base font-bold tracking-[-0.01em] text-text">
          {movie.title}
        </h3>
        <p className="m-0 mt-1 text-sm font-medium text-text-sub">
          {movie.releaseYear ? `${movie.releaseYear} · ` : ''}
          {movie.runtimeMin}분{ratioLabel ? ` · 화면비 ${ratioLabel}` : ''}
        </p>
        {formats.length > 0 ? (
          <p className="m-0 mt-1.5 text-[13px] font-semibold text-accent">{formats.join(' · ')}</p>
        ) : null}
        <p className="m-0 mt-2 text-[13px] font-medium text-text-sub">{verificationSummary(movie)}</p>
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
