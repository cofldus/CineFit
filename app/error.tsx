'use client';

// 내부 오류 내용을 그대로 노출하지 않는 공통 오류 화면
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto max-w-xl px-4 pb-24 pt-6">
      <div className="rounded-card-lg border border-border bg-surface p-5">
        <h2 className="m-0 text-lg font-bold text-text">문제가 발생했어요</h2>
        <p className="mt-2 text-sm text-text-sub">
          일시적인 오류일 수 있어요. DB가 준비되지 않았다면{' '}
          <code className="rounded-md bg-bg px-1.5 py-0.5 text-[13px]">npm run db:seed</code>를 먼저
          실행해 주세요.
        </p>
        <button
          className="mt-4 inline-flex min-h-11 items-center rounded-card bg-primary-strong px-5 text-[15px] font-semibold text-white hover:bg-primary-strong-hover"
          onClick={() => reset()}
        >
          다시 시도
        </button>
      </div>
    </main>
  );
}
