'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

const inputCls =
  'min-h-[52px] w-full rounded-card border border-border bg-bg px-3.5 text-base tracking-[0.04em] text-text outline-none transition-shadow focus-visible:border-primary-strong focus-visible:ring-[3px] focus-visible:ring-primary-soft';

export function AlphaInviteForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const code = new FormData(e.currentTarget).get('code');
    try {
      const res = await fetch('/api/alpha/redeem', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? '초대 코드를 확인할 수 없습니다.');
      const next = searchParams.get('next') || '/alpha/consent';
      router.push(next === '/' ? '/alpha/consent' : `/alpha/consent?next=${encodeURIComponent(next)}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : '초대 코드를 확인할 수 없습니다.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 max-w-content" aria-label="초대 코드 입력">
      <label className="block text-sm font-semibold text-text" htmlFor="code">
        초대 코드
      </label>
      <div className="mt-2 flex flex-col gap-2.5 sm:flex-row">
        <input id="code" name="code" type="text" required autoComplete="off" placeholder="예: CINEFIT-XXXX" className={inputCls} />
        <button
          type="submit"
          disabled={busy}
          className="min-h-[52px] shrink-0 rounded-card bg-primary-strong px-6 text-sm font-semibold text-white transition-colors hover:bg-primary-strong-hover disabled:opacity-60"
        >
          {busy ? '확인 중…' : '입장하기'}
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm text-trust-low">
          {error}
        </p>
      )}
    </form>
  );
}
