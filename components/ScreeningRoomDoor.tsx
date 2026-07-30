import { FORMAT_LABELS } from '../src/domain/recommendation/presets';
import type { MovieWithSpecs } from '../src/domain/recommendation/types';
import { keySpecEntries } from '../src/lib/display';
import { TrackedLink } from './TrackedLink';

const MIN_RATIO = 1.85;
const MAX_RATIO = 2.39;

// 문틈으로 새어 나오는 빛의 양을 실제 화면비에서 계산한다 — 장식이 아니라 데이터가 그래픽이
// 되게 하는 원칙(§design-lab). 화면비가 없으면 중간값으로 고정한다.
function openness(ratio: number | null): number {
  if (ratio === null) return 55;
  const clamped = Math.min(MAX_RATIO, Math.max(MIN_RATIO, ratio));
  return 35 + ((clamped - MIN_RATIO) / (MAX_RATIO - MIN_RATIO)) * 55;
}

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

export function ScreeningRoomDoor({ movie, roomNumber }: { movie: MovieWithSpecs; roomNumber: number }) {
  const nativeAr = movie.specs.native_ar?.value ? Number(movie.specs.native_ar.value) : null;
  const ratioLabel = nativeAr ? `${nativeAr.toFixed(2)}:1` : null;
  const formats = topFormats(movie, 2);
  const openPercent = openness(nativeAr);

  return (
    <TrackedLink
      event="movie_selected"
      eventProperties={{ movieId: movie.id }}
      href={`/recommend/${movie.id}`}
      className="group block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cinema-red"
    >
      <span className="inline-flex min-h-6 items-center rounded-sm bg-cinema-red px-2 text-[11px] font-bold text-white">
        {roomNumber}관
      </span>
      <div
        className="relative mt-3 overflow-hidden rounded-t-3xl bg-cinema-black-raised transition-[filter] duration-200 group-hover:brightness-110"
        style={{ aspectRatio: `${nativeAr ?? 1.85} / 1.3` }}
      >
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 mx-auto"
          style={{
            width: `${openPercent}%`,
            height: '100%',
            background: 'linear-gradient(to top, #fdf6ec, #d8c9ad 55%, transparent 100%)',
          }}
        />
      </div>
      <div className="mt-3">
        <h3 className="font-wanted text-lg font-extrabold tracking-[-0.02em] text-cinema-ink group-hover:underline sm:text-xl">
          {movie.title}
          {movie.releaseYear ? <span className="font-normal text-cinema-ink-muted"> ({movie.releaseYear})</span> : null}
        </h3>
        <p className="mt-1 font-mono text-xs text-cinema-ink-muted">
          {[ratioLabel, ...formats].filter(Boolean).join(' · ')}
        </p>
        <p className="mt-1.5 text-xs text-cinema-ink-muted">{verificationNote(movie)}</p>
      </div>
    </TrackedLink>
  );
}
