import Image from 'next/image';
import { FORMAT_LABELS } from '../src/domain/recommendation/presets';
import type { MovieWithSpecs } from '../src/domain/recommendation/types';
import { formatSpecValue, keySpecEntries, SPEC_KEY_LABELS } from '../src/lib/display';
import { IconArrowRight } from './Icon';
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
        className="group block w-[85%] shrink-0 snap-start rounded-card-lg border border-border bg-surface p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-float focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:translate-y-0 sm:w-auto"
      >
        {/* 화면비 프레임 — 실제 극장의 마스킹 원리: 외곽 프레임(스크린 벽)은 모든 카드에서
            동일한 2.39:1로 고정되고(행 정렬 유지), 영화의 실제 화면비만큼만 안쪽 화면이
            켜진다. 남는 좌우는 어두운 마스킹으로 남아 비율 차이가 즉각 체감된다. */}
        <div aria-hidden>
          {formats.length > 0 ? (
            <div className="mb-2 flex flex-wrap gap-1">
              {formats.map((f) => (
                <span
                  key={f}
                  className="rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-text-sub"
                >
                  {f}
                </span>
              ))}
            </div>
          ) : null}
          <div
            className="relative flex w-full items-center justify-center overflow-hidden rounded-[8px] border border-white/10 bg-[#0d0b0c] transition-shadow group-hover:shadow-glow-primary"
            style={{ aspectRatio: `${RATIO_MAX} / 1` }}
          >
            <div
              className="relative flex h-full items-center justify-center overflow-hidden"
              style={{
                width: `${(clampedAr / RATIO_MAX) * 100}%`,
                background:
                  'linear-gradient(180deg, rgba(135, 43, 66, 0.48) 0%, rgba(64, 42, 49, 0.95) 60%, rgba(38, 28, 31, 0.98) 100%)',
              }}
            >
              {/* 실제 포스터(KMDb 공식 API)가 있으면 켜진 화면의 배경으로 어둡게 깔린다 —
                  화면비 마스킹 정체성은 유지하면서 "빈 상자" 인상을 없앤다. 없으면 와인
                  그라데이션 폴백. */}
              {movie.posterUrl ? (
                <>
                  <Image src={movie.posterUrl} alt="" fill sizes="250px" className="object-cover" />
                  <span className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,10,11,0.3)_0%,rgba(11,10,11,0.78)_100%)]" />
                </>
              ) : null}
              <span
                className="absolute inset-x-2 top-0 h-px"
                style={{ background: 'linear-gradient(90deg, transparent, rgba(201, 111, 132, 0.85), transparent)' }}
              />
              <span className="relative whitespace-nowrap text-base font-light tracking-[0.14em] tabular-nums text-hero-text">
                {ratioLabel ?? `${clampedAr.toFixed(2)}:1`}
              </span>
            </div>
          </div>
        </div>
        {/* 제목과 연도·러닝타임을 한 문장으로 붙이지 않고 별도 줄로 나눈다 — 편집된 영화
            정보처럼 보이게 하는 최소 구조(브리프 §영화 정보 구조). */}
        <h3 className="m-0 mt-4 line-clamp-2 text-lg font-bold text-text">
          {movie.title}
        </h3>
        <p className="m-0 mt-1 tabular-nums text-[14px] font-medium text-text-sub">
          {movie.releaseYear ? `${movie.releaseYear} · ` : ''}
          {movie.runtimeMin}분
        </p>
        <p className="m-0 mt-3 flex items-center justify-between gap-2 border-t border-border pt-3 text-[13.5px] font-medium text-text-sub">
          상영 정보 {verificationSummary(movie)}
          <IconArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1" />
        </p>
      </TrackedLink>
    );
  }

  const nativeAr = movie.specs.native_ar?.value ? Number(movie.specs.native_ar.value) : null;
  const ratioLabel = nativeAr ? `${nativeAr.toFixed(2)}:1` : null;
  const clampedAr = Math.min(RATIO_MAX, Math.max(RATIO_MIN, nativeAr ?? 1.85));
  const formats = topFormats(movie, 3);
  // native_ar·format_versions는 위 프레임/뱃지에서 이미 보여주므로 아래 목록에서는 뺀다(중복 제거).
  const restSpecs = keySpecEntries(movie).filter(({ key }) => key !== 'native_ar' && key !== 'format_versions');

  return (
    <article
      className="group flex h-full flex-col overflow-hidden rounded-card-lg border border-border bg-surface transition-all duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:bg-surface-raised hover:shadow-float"
      aria-labelledby={`movie-${movie.id}-title`}
    >
      {/* 영화마다 실제 화면비로 모양이 달라지는 프레임 — compact 카드와 같은 원칙(화면비 자체가
          카드의 정체성). 상단에 배급 포맷 뱃지를 얹어 한눈에 "이 영화가 어떤 버전으로 상영되는지"
          보이게 한다. */}
      {/* 화면비 프레임 — 아래쪽 브론즈 트림으로 "스크린 하단 조명"을 흉내내 의도된 시네마
          프레임처럼 보이게 한다(브리프: "the top frame should feel like a screen"). */}
      <div
        aria-hidden
        className="relative flex items-center justify-center border-b-2 border-b-accent/60 bg-hero px-4 transition-shadow group-hover:shadow-glow-primary"
        style={{
          aspectRatio: `${clampedAr} / 1`,
          background: 'radial-gradient(ellipse 85% 95% at 50% 100%, var(--hero-soft), var(--hero) 78%)',
        }}
      >
        <span className="whitespace-nowrap text-2xl font-light tracking-[0.14em] tabular-nums text-hero-text sm:text-[28px]">
          {ratioLabel ?? `${clampedAr.toFixed(2)}:1`}
        </span>
        {formats.length > 0 ? (
          <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
            {formats.map((f) => (
              <span
                key={f}
                className="rounded-full border border-hero-border bg-bg/70 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-hero-text-sub backdrop-blur-sm"
              >
                {f}
              </span>
            ))}
          </div>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col p-5">
        {/* 영화 정보를 한 문장으로 붙이지 않고 편집된 블록으로 나눈다: 제목 → 연도·러닝타임 →
            원제 → 감독·장르 (브리프 §영화 정보 구조). 포맷·검증 정보는 아래 별도 행으로. */}
        <h3 id={`movie-${movie.id}-title`} className="m-0 text-lg font-bold text-text">
          {movie.title}
        </h3>
        <p className="m-0 mt-1 tabular-nums text-[13.5px] font-medium text-text-sub">
          {movie.releaseYear ? `${movie.releaseYear} · ` : ''}
          {movie.runtimeMin}분
        </p>
        {movie.originalTitle ? (
          <p className="m-0 mt-2.5 text-[13px] italic text-text-tertiary">{movie.originalTitle}</p>
        ) : null}
        <p className="m-0 mt-0.5 text-[13px] text-text-tertiary">
          {[movie.director, movie.genres.join('·')].filter(Boolean).join(' · ')}
        </p>
        {restSpecs.length > 0 ? (
          <ul className="m-0 mt-3.5 flex list-none flex-col gap-1.5 border-t border-border p-0 pt-3.5">
            {restSpecs.map(({ key, spec }) => (
              <li key={key} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                <span className="text-text-sub">{SPEC_KEY_LABELS[key]}</span>
                <strong className="font-semibold text-text">{formatSpecValue(key, spec)}</strong>
                <TrustBadge status={spec.infoStatus} observedAt={spec.observedAt} />
              </li>
            ))}
          </ul>
        ) : null}
        <div className="mt-auto pt-4">
          <TrackedLink
            event="movie_selected"
            eventProperties={{ movieId: movie.id }}
            href={`/recommend/${movie.id}`}
            className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-card bg-primary-strong px-5 text-[15px] font-semibold text-white transition-all hover:bg-primary-strong-hover active:scale-[0.98]"
          >
            이 영화로 추천받기
            <IconArrowRight className="h-4 w-4 shrink-0" />
          </TrackedLink>
        </div>
      </div>
    </article>
  );
}
