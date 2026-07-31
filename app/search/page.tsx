import type { Metadata } from 'next';
import Link from 'next/link';
import { Notice } from '../../components/Notice';
import { IconArrowRight, IconFilm, IconSearch, IconSeat } from '../../components/Icon';
import { searchRepository } from '../../src/data/searchRepository';

export const metadata: Metadata = { title: '검색' };
export const dynamic = 'force-dynamic';

const resultRowCls =
  'group flex items-center gap-3 rounded-card-lg border border-border bg-surface p-4 transition-all duration-150 hover:-translate-y-0.5 hover:border-border-strong hover:bg-surface-raised hover:shadow-float focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-strong active:translate-y-0 active:shadow-none';

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const q = (await searchParams).q?.trim() ?? '';
  const results = q ? await searchRepository.search(q) : { movies: [], cinemas: [] };
  const hasResults = results.movies.length > 0 || results.cinemas.length > 0;

  return (
    <main className="mx-auto max-w-wide px-4 pb-24 pt-10 sm:pt-14">
      <h1 className="font-wanted m-0 text-[28px] font-bold tracking-[-0.02em] text-text sm:text-[32px]">검색</h1>

      <form method="get" className="mt-5 max-w-content" role="search">
        <label className="block text-[15px] text-text-sub" htmlFor="q">
          영화 제목·원제·별칭 또는 상영관 이름으로 찾아보세요
        </label>
        <div className="relative mt-2">
          <IconSearch aria-hidden className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-text-tertiary" />
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={q}
            placeholder="예: 듄2, 용아맥, 코엑스"
            className="min-h-[52px] w-full rounded-full border border-border bg-surface pl-11 pr-[92px] text-base text-text outline-none transition-shadow placeholder:text-text-tertiary focus-visible:border-primary-strong focus-visible:ring-[3px] focus-visible:ring-primary-soft"
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1/2 min-h-10 -translate-y-1/2 rounded-full bg-primary-strong px-5 text-sm font-semibold text-white transition-colors hover:bg-primary-strong-hover"
          >
            검색
          </button>
        </div>
      </form>

      {q && !hasResults && (
        <div className="mt-6 max-w-content">
          <Notice>&ldquo;{q}&rdquo;에 대한 결과가 없어요. 별칭이나 지역명으로도 검색할 수 있어요.</Notice>
        </div>
      )}

      {results.movies.length > 0 && (
        <section className="mt-8 max-w-content">
          <h2 className="m-0 text-[15px] font-bold uppercase tracking-[0.06em] text-text-sub">
            영화 {results.movies.length}건
          </h2>
          <ul className="m-0 mt-3 flex list-none flex-col gap-2 p-0">
            {results.movies.map((m) => (
              <li key={m.id}>
                <Link href={`/recommend/${m.id}`} className={resultRowCls}>
                  <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary-strong">
                    <IconFilm className="h-[18px] w-[18px]" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-text">{m.title}</span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[13px] text-text-sub">
                      {m.originalTitle && <span>{m.originalTitle}</span>}
                      {m.matchedAlias && <span>별칭 &ldquo;{m.matchedAlias}&rdquo; 일치</span>}
                    </span>
                  </span>
                  <IconArrowRight aria-hidden className="h-4 w-4 shrink-0 text-text-tertiary transition-transform group-hover:translate-x-1" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {results.cinemas.length > 0 && (
        <section className="mt-8 max-w-content">
          <h2 className="m-0 text-[15px] font-bold uppercase tracking-[0.06em] text-text-sub">
            상영관 {results.cinemas.length}건
          </h2>
          <ul className="m-0 mt-3 flex list-none flex-col gap-2 p-0">
            {results.cinemas.map((c) => (
              <li key={c.auditoriumId}>
                <Link href={`/cinemas/${c.auditoriumId}`} className={resultRowCls}>
                  <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
                    <IconSeat className="h-[18px] w-[18px]" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-text">{c.label}</span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[13px] text-text-sub">
                      <span>{c.brand}</span>
                      {c.matchedAlias && <span>별칭 &ldquo;{c.matchedAlias}&rdquo; 일치</span>}
                    </span>
                  </span>
                  <IconArrowRight aria-hidden className="h-4 w-4 shrink-0 text-text-tertiary transition-transform group-hover:translate-x-1" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
