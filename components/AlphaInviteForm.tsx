'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

const inputCls =
  'min-h-11 w-full rounded-card border border-border bg-bg px-3 text-base text-text outline-none focus-visible:ring-[3px] focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface';

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
    <form onSubmit={onSubmit} className="mt-4 max-w-content" aria-label="초대 코드 입력">
      <label className="block text-sm font-medium text-text-sub" htmlFor="code">
        초대 코드
      </label>
      <div className="mt-1.5 flex gap-2">
        <input id="code" name="code" type="text" required autoComplete="off" className={inputCls} />
        <button
          type="submit"
          disabled={busy}
          className="min-h-11 shrink-0 rounded-card bg-primary-strong px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-strong-hover disabled:opacity-60"
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
