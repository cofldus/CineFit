'use client';

import { useSearchParams } from 'next/navigation';
import { useState } from 'react';

export function AlphaConsentForm() {
  const searchParams = useSearchParams();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onAgree() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/alpha/consent', { method: 'POST' });
      if (!res.ok) throw new Error('동의 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.');
      const next = searchParams.get('next') || '/';
      // router.push(클라이언트 사이드 전환)를 쓰면 동의 전에 캐시된 "/alpha/invite로 리다이렉트"
      // 결과를 Next.js 라우터 캐시가 그대로 재사용해 게이트를 통과했는데도 다시 초대 페이지로
      // 튕기는 문제가 있었다 — 항상 서버에 새로 확인하도록 하드 네비게이션으로 이동한다.
      window.location.href = next;
    } catch (err) {
      setError(err instanceof Error ? err.message : '동의 처리에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 max-w-content">
      <button
        type="button"
        onClick={onAgree}
        disabled={busy}
        className="flex min-h-12 w-full items-center justify-center rounded-card bg-primary-strong text-base font-semibold text-white transition-colors hover:bg-primary-strong-hover disabled:opacity-60"
      >
        {busy ? '처리 중…' : '동의하고 시작하기'}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-sm text-trust-low">
          {error}
        </p>
      )}
    </div>
  );
}
