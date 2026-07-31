import type { Metadata } from 'next';
import Link from 'next/link';
import { Notice } from '../../components/Notice';
import { searchRepository } from '../../src/data/searchRepository';

export const metadata: Metadata = { title: '검색' };
export const dynamic = 'force-dynamic';

const inputCls =
  'min-h-11 w-full rounded-card border border-border bg-bg px-3 text-base text-text outline-none focus-visible:ring-[3px] focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface';

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const q = (await searchParams).q?.trim() ?? '';
  const results = q ? await searchRepository.search(q) : { movies: [], cinemas: [] };
  const hasResults = results.movies.length > 0 || results.cinemas.length > 0;

  return (
    <main className="mx-auto max-w-wide px-4 pb-24 pt-6">
      <h1 className="font-wanted text-2xl font-bold tracking-[-0.01em] text-text">검색</h1>
      <form method="get" className="mt-3 max-w-content" role="search">
        <label className="block text-sm font-medium text-text-sub" htmlFor="q">
          영화 제목·원제·별칭 또는 상영관 이름으로 찾아보세요
        </label>
        <div className="mt-1.5 flex gap-2">
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={q}
            placeholder="예: 듄2, 용아맥, 코엑스"
            className={inputCls}
          />
          <button
            type="submit"
            className="min-h-11 shrink-0 rounded-card bg-primary-strong px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-strong-hover"
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
        <section className="mt-6 max-w-content">
          <h2 className="text-lg font-bold text-text">영화 {results.movies.length}건</h2>
          <ul className="mt-2 flex flex-col gap-2">
            {results.movies.map((m) => (
              <li key={m.id}>
                <Link
                  href={`/recommend/${m.id}`}
                  className="block rounded-card-lg border border-border bg-surface p-4 hover:bg-bg"
                >
                  <span className="font-semibold text-text">{m.title}</span>
                  {m.originalTitle && <span className="ml-2 text-sm text-text-sub">{m.originalTitle}</span>}
                  {m.matchedAlias && (
                    <span className="ml-2 text-sm font-medium text-text-sub">별칭 &ldquo;{m.matchedAlias}&rdquo; 일치</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {results.cinemas.length > 0 && (
        <section className="mt-6 max-w-content">
          <h2 className="text-lg font-bold text-text">상영관 {results.cinemas.length}건</h2>
          <ul className="mt-2 flex flex-col gap-2">
            {results.cinemas.map((c) => (
              <li key={c.auditoriumId}>
                <Link
                  href={`/cinemas/${c.auditoriumId}`}
                  className="block rounded-card-lg border border-border bg-surface p-4 hover:bg-bg"
                >
                  <span className="font-semibold text-text">{c.label}</span>
                  <span className="ml-2 text-sm text-text-sub">{c.brand}</span>
                  {c.matchedAlias && (
                    <span className="ml-2 text-sm font-medium text-text-sub">별칭 &ldquo;{c.matchedAlias}&rdquo; 일치</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
