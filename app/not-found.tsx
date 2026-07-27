import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="mx-auto max-w-xl px-4 pb-24 pt-6">
      <div className="rounded-card-lg border border-border bg-surface p-5">
        <h2 className="m-0 text-lg font-bold text-text">페이지를 찾을 수 없어요</h2>
        <p className="mt-2 text-sm text-text-sub">주소가 잘못됐거나, 요청한 영화·정보가 없어요.</p>
        <Link
          href="/"
          className="mt-4 inline-flex min-h-11 items-center rounded-card bg-primary px-5 text-[15px] font-semibold text-white hover:bg-primary-hover"
        >
          홈으로
        </Link>
      </div>
    </main>
  );
}
