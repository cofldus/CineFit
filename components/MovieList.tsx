'use client';

import Image from 'next/image';
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
 * 영화 선택 목록(R14 보강) — 넓은 화면에서 리스트만 좌우로 늘어지던 구조를, 좌측 sticky
 * 카탈로그 레일(검색 + 포맷별 편수 필터 + 현재 결과 수) / 우측 목록의 2단으로 재편한다.
 * 폭을 채우는 게 아니라 폭에 역할을 준다. 모바일은 기존 sticky 상단 검색·칩 유지.
 * 필터링은 이미 받아온 목록에 대한 클라이언트 측 표시 필터일 뿐, 데이터 요청을 바꾸지 않는다.
 */
// 정렬(R15 §4) — 전부 이미 받아온 목록에 대한 클라이언트 정렬. 값은 실제 데이터에서만 파생.
const SORTS = [
  { key: 'info', label: '상영 정보 충분한 순' },
  { key: 'special', label: '특별관 많은 순' },
  { key: 'runtime', label: '러닝타임 순' },
  { key: 'name', label: '가나다순' },
] as const;
type SortKey = (typeof SORTS)[number]['key'];

function verifiedCount(movie: MovieWithSpecs): number {
  return keySpecEntries(movie).filter((e) => e.spec.infoStatus === 'official' || e.spec.infoStatus === 'multi_source')
    .length;
}

export function MovieList({ movies }: { movies: MovieWithSpecs[] }) {
  const [query, setQuery] = useState('');
  const [format, setFormat] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>('info');

  const formatCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of movies) for (const f of movieFormats(m)) counts.set(f, (counts.get(f) ?? 0) + 1);
    return counts;
  }, [movies]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = movies.filter((m) => {
      if (q && !m.title.toLowerCase().includes(q) && !(m.originalTitle ?? '').toLowerCase().includes(q)) return false;
      if (format && !movieFormats(m).includes(format)) return false;
      return true;
    });
    const specialCount = (m: MovieWithSpecs) => movieFormats(m).filter((f) => f !== 'standard').length;
    return [...base].sort((a, b) => {
      if (sort === 'info') return verifiedCount(b) - verifiedCount(a) || a.title.localeCompare(b.title, 'ko');
      if (sort === 'special') return specialCount(b) - specialCount(a) || a.title.localeCompare(b.title, 'ko');
      if (sort === 'runtime') return a.runtimeMin - b.runtimeMin;
      return a.title.localeCompare(b.title, 'ko');
    });
  }, [movies, query, format, sort]);

  const activeFilters = (query.trim() ? 1 : 0) + (format ? 1 : 0);

  const searchBox = (
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
  );

  const list =
    filtered.length === 0 ? (
      <p className="mt-8 text-sm text-text-sub">조건에 맞는 영화가 없어요. 검색어나 포맷 필터를 지워보세요.</p>
    ) : (
      <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 @3xl:grid-cols-2">
        {filtered.map((movie) => {
          const nativeAr = movie.specs.native_ar?.value ? Number(movie.specs.native_ar.value) : null;
          const clampedAr = Math.min(RATIO_MAX, Math.max(RATIO_MIN, nativeAr ?? 1.85));
          const formats = movieFormats(movie);
          return (
            <li key={movie.id} className="list-enter">
              <TrackedLink
                event="movie_selected"
                eventProperties={{ movieId: movie.id }}
                href={`/recommend/${movie.id}`}
                className="edge-sweep group flex items-center gap-3.5 rounded-card-lg bg-surface-raised p-3.5 transition-colors duration-200 hover:bg-surface-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:gap-4 sm:p-4"
              >
                {/* 미니 스크린 썸네일 — 실제 극장의 마스킹 원리: 외곽 프레임은 모든 행에서
                    동일한 2.39:1이고, 영화의 실제 화면비만큼만 안쪽이 켜진다. 남는 좌우는
                    어두운 마스킹으로 남아 비율 차이가 한눈에 보인다. */}
                <div
                  aria-hidden
                  className="relative flex w-28 shrink-0 items-center justify-center overflow-hidden rounded-[7px] border border-white/10 bg-[#0d0b0c]"
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
                    {/* 실제 포스터(KMDb 공식 API)가 있으면 켜진 화면 배경으로 어둡게 —
                        없으면 와인 그라데이션 폴백. */}
                    {movie.posterUrl ? (
                      <>
                        <Image src={movie.posterUrl} alt="" fill sizes="112px" className="object-cover transition-transform duration-300 group-hover:scale-[1.05]" />
                        <span className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,10,11,0.3)_0%,rgba(11,10,11,0.78)_100%)]" />
                      </>
                    ) : null}
                    <span
                      className="absolute inset-x-1.5 top-0 h-px"
                      style={{ background: 'linear-gradient(90deg, transparent, rgba(201, 111, 132, 0.8), transparent)' }}
                    />
                    <span className="relative whitespace-nowrap text-[10.5px] font-normal tracking-[0.1em] tabular-nums text-hero-text">
                      {nativeAr ? `${nativeAr.toFixed(2)}:1` : `${clampedAr.toFixed(2)}:1`}
                    </span>
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="m-0 truncate text-[16px] font-bold text-text">{movie.title}</h3>
                  <p className="m-0 mt-0.5 truncate text-[13px] tabular-nums text-text-sub">
                    {movie.releaseYear ? `${movie.releaseYear} · ` : ''}
                    {movie.runtimeMin}분
                    {movie.director ? ` · ${movie.director}` : ''}
                  </p>
                  {/* 태그는 최대 2개 + 초과분 +N(R15 §4) — 모바일 스캔 피로를 줄인다. R16 §2:
                      검증 상태를 "상영 정보 확인됨" 대신 짧은 "· 확인됨"으로 줄였다. overflow-hidden
                      +nowrap은 "상영…"/"일부 추…"처럼 어절 중간을 잘랐다 — flex-wrap으로 바꿔 흔한
                      경우(확인됨)는 한 줄, 긴 상태(일부 추정)만 다음 줄로 깔끔히 넘어가게 한다. */}
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1">
                    {formats.slice(0, 2).map((f) => (
                      <span key={f} className="shrink-0 rounded-full border border-border px-2 py-px text-[11px] font-medium text-text-sub">
                        {FORMAT_LABELS[f] ?? f}
                      </span>
                    ))}
                    {formats.length > 2 ? (
                      <span className="shrink-0 text-[11px] font-medium tabular-nums text-text-tertiary">+{formats.length - 2}</span>
                    ) : null}
                    <span className="shrink-0 text-[12px] text-text-tertiary" title="상영 정보 확인 상태">
                      · {verificationSummary(movie)}
                    </span>
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
    );

  return (
    <div className="lg:grid lg:grid-cols-[250px_minmax(0,1fr)] lg:items-start lg:gap-12">
      {/* 모바일: sticky 상단 검색 + 필터 칩 */}
      <div className="sticky top-0 z-20 -mx-4 border-b border-border bg-bg/95 px-4 py-3 backdrop-blur-md lg:hidden">
        {searchBox}
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

      {/* 데스크톱: 좌측 sticky 카탈로그 레일 — 검색·포맷별 편수·결과 수. */}
      <aside className="hidden lg:block" aria-label="영화 검색·필터">
        <div className="sticky top-24 flex flex-col gap-5">
          {searchBox}
          <nav aria-label="포맷 필터">
            <p className="m-0 mb-2 text-[12px] font-semibold uppercase tracking-wide text-text-tertiary">포맷</p>
            <ul className="m-0 flex list-none flex-col p-0">
              {[null, ...FILTER_FORMATS].map((f) => {
                const active = format === f;
                const count = f === null ? movies.length : (formatCounts.get(f) ?? 0);
                return (
                  <li key={f ?? 'all'}>
                    <button
                      type="button"
                      aria-pressed={active}
                      onClick={() => setFormat(f)}
                      className={`flex min-h-10 w-full items-center justify-between gap-3 border-l-2 px-3 text-left text-[14px] transition-colors ${
                        active
                          ? 'border-primary-strong font-semibold text-text'
                          : 'border-border text-text-sub hover:border-border-strong hover:text-text'
                      }`}
                    >
                      {f === null ? '전체' : (FORMAT_LABELS[f] ?? f)}
                      <span className={`text-[12.5px] tabular-nums ${active ? 'text-primary' : 'text-text-tertiary'}`}>{count}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
          {/* 정렬(R15 §4) — 필터와 같은 세로 리스트 문법. */}
          <nav aria-label="정렬">
            <p className="m-0 mb-2 text-[12px] font-semibold uppercase tracking-wide text-text-tertiary">정렬</p>
            <ul className="m-0 flex list-none flex-col p-0">
              {SORTS.map((s) => {
                const active = sort === s.key;
                return (
                  <li key={s.key}>
                    <button
                      type="button"
                      aria-pressed={active}
                      onClick={() => setSort(s.key)}
                      className={`flex min-h-9 w-full items-center border-l-2 px-3 text-left text-[13.5px] transition-colors ${
                        active
                          ? 'border-primary-strong font-semibold text-text'
                          : 'border-border text-text-sub hover:border-border-strong hover:text-text'
                      }`}
                    >
                      {s.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
          <p className="m-0 border-t border-border pt-4 text-[13px] tabular-nums text-text-sub" role="status" aria-live="polite">
            {activeFilters > 0 ? `필터 ${activeFilters}개 적용 · 영화 ${filtered.length}편` : `전체 ${movies.length}편`}
          </p>
        </div>
      </aside>

      <div className="@container mt-5 lg:mt-0">{list}</div>
    </div>
  );
}
