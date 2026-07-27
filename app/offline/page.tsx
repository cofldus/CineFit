import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: '오프라인' };

// 서비스워커가 캐시하는 정적 안내 화면 — DB 접근 없음
export default function OfflinePage() {
  return (
    <main className="mx-auto max-w-xl px-4 pb-24 pt-6">
      <div className="rounded-card-lg border border-border bg-surface p-5">
        <h2 className="m-0 text-lg font-bold text-text">오프라인 상태예요</h2>
        <p className="mt-2 text-sm text-text-sub">
          인터넷 연결이 없어 추천을 계산할 수 없어요. 정보가 얼마나 최신인지가 중요한 서비스라,
          오래된 캐시 결과는 대신 보여드리지 않아요.
        </p>
        <p className="mt-2 text-sm text-text-sub">연결이 복구되면 아래 버튼으로 다시 시작해 주세요.</p>
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
