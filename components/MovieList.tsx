'use client';

import { useMemo, useState } from 'react';
import { FORMAT_LABELS } from '../src/domain/recommendation/presets';
import type { MovieWithSpecs } from '../src/domain/recommendation/types';
import { keySpecEntries } from '../src/lib/display';
import { IconChevronRight, IconSearch } from './Icon';
import { TrackedLink } from './TrackedLink';

const RATIO_MIN = 1.85;
const RATIO_MAX = 2.39;

// 필터 칩에 노출할 포맷 — 실제 데이터(format_versions)에 쓰이는 값들.
const FILTER_FORMATS = ['imax', 'dolby_cinema', '4dx', 'superplex', 'standard'] as const;

function movieFormats(movie: MovieWithSpecs): string[] {
  const raw = movie.specs.format_versions?.value;
  return Array.isArray(raw) ? raw.map(String) : [];
}

function verificationSummary(movie: MovieWithSpecs): string {
  const entries = keySpecEntries(movie);
  if (entries.length === 0) return '확인 중';
  const verified = entries.filter((e) => e.spec.infoStatus === 'official' || e.spec.infoStatus === 'multi_source').length;
  return verified === entries.length ? '확인됨' : '일부 추정';
}

/**
 * 영화 선택 목록 — 세로로 긴 카드 대신 가로형 컴팩트 리스트 카드(모바일 한 카드 약 120px).
 * 왼쪽 썸네일은 포스터가 아니라 그 영화의 실제 화면비 모양을 가진 미니 스크린(와인 간접광),
 * 오른쪽은 제목·연도·러닝타임·포맷 칩·검증 요약 한 줄. 상단에는 sticky 검색 + 포맷 필터.
 * 필터링은 이미 받아온 목록에 대한 클라이언트 측 표시 필터일 뿐, 데이터 요청을 바꾸지 않는다.
 */
export function MovieList({ movies }: { movies: MovieWithSpecs[] }) {
  const [query, setQuery] = useState('');
  const [format, setFormat] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return movies.filter((m) => {
      if (q && !m.title.toLowerCase().includes(q) && !(m.originalTitle ?? '').toLowerCase().includes(q)) return false;
      if (format && !movieFormats(m).includes(format)) return false;
      return true;
    });
  }, [movies, query, format]);

  return (
    <div>
      <div className="sticky top-0 z-20 -mx-4 border-b border-border bg-bg/95 px-4 py-3 backdrop-blur-md">
        <div className="relative">
          <IconSearch aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="영화 제목 검색"
            aria-label="영화 제목 검색"
            className="min-h-11 w-full rounded-card border border-border bg-surface-raised pl-10 pr-3.5 text-[15px] text-text outline-none transition-colors placeholder:text-text-tertiary focus-visible:border-primary"
          />
        </div>
        <div className="mt-2.5 flex flex-wrap gap-1.5" role="group" aria-label="포맷 필터">
          <button
            type="button"
            aria-pressed={format === null}
            onClick={() => setFormat(null)}
            className={`min-h-8 rounded-full px-3 text-[12.5px] font-semibold transition-colors ${
              format === null ? 'bg-primary-strong text-white' : 'text-text-sub hover:text-text'
            }`}
          >
            전체
          </button>
          {FILTER_FORMATS.map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={format === f}
              onClick={() => setFormat((prev) => (prev === f ? null : f))}
              className={`min-h-8 rounded-full px-3 text-[12.5px] font-semibold transition-colors ${
                format === f ? 'bg-primary-strong text-white' : 'text-text-sub hover:text-text'
              }`}
            >
              {FORMAT_LABELS[f] ?? f}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="mt-8 text-sm text-text-sub">조건에 맞는 영화가 없어요. 검색어나 포맷 필터를 지워보세요.</p>
      ) : (
        <ul className="m-0 mt-5 grid list-none grid-cols-1 gap-3 p-0 lg:grid-cols-2">
          {filtered.map((movie) => {
            const nativeAr = movie.specs.native_ar?.value ? Number(movie.specs.native_ar.value) : null;
            const clampedAr = Math.min(RATIO_MAX, Math.max(RATIO_MIN, nativeAr ?? 1.85));
            const formats = movieFormats(movie).slice(0, 3);
            return (
              <li key={movie.id} className="list-enter">
                <TrackedLink
                  event="movie_selected"
                  eventProperties={{ movieId: movie.id }}
                  href={`/recommend/${movie.id}`}
                  className="group flex items-center gap-4 rounded-card-lg bg-surface-raised p-4 transition-all duration-200 hover:-translate-y-0.5 hover:bg-surface-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  {/* 미니 스크린 썸네일 — 영화의 실제 화면비 모양 그대로, 와인 간접광. */}
                  <div className="w-24 shrink-0 sm:w-28">
                    <div
                      aria-hidden
                      className="flex items-center justify-center rounded-[8px]"
                      style={{
                        aspectRatio: `${clampedAr} / 1`,
                        background: 'radial-gradient(ellipse 90% 100% at 50% 110%, rgba(93, 24, 40, 0.65), #241c1f 75%)',
                        borderTop: '1.5px solid #872b42',
                      }}
                    >
                      <span className="font-mono text-[11px] font-semibold tracking-[0.06em] text-hero-text">
                        {nativeAr ? `${nativeAr.toFixed(2)}:1` : `${clampedAr.toFixed(2)}:1`}
                      </span>
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="m-0 truncate text-[16.5px] font-bold text-text">{movie.title}</h3>
                    <p className="m-0 mt-0.5 truncate text-[13px] tabular-nums text-text-sub">
                      {movie.releaseYear ? `${movie.releaseYear} · ` : ''}
                      {movie.runtimeMin}분
                      {movie.director ? ` · ${movie.director}` : ''}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      {formats.map((f) => (
                        <span key={f} className="rounded-full border border-border px-2 py-px text-[11px] font-medium text-text-sub">
                          {FORMAT_LABELS[f] ?? f}
                        </span>
                      ))}
                      <span className="text-[12px] text-text-tertiary">상영 정보 {verificationSummary(movie)}</span>
                    </div>
                  </div>
                  <IconChevronRight
                    aria-hidden
                    className="h-4 w-4 shrink-0 text-text-tertiary transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
                  />
                </TrackedLink>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
