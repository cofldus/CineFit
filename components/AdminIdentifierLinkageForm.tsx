'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

async function postAction(body: Record<string, unknown>): Promise<void> {
  const res = await fetch('/api/admin/data-linkage', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? '요청에 실패했습니다.');
  }
}

export function ApproveRejectButtons({ candidateId, disabled }: { candidateId: number; disabled?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(action: 'approve' | 'reject') {
    setBusy(action);
    setError(null);
    try {
      await postAction({ action, candidateId });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : '요청에 실패했습니다.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="row" style={{ gap: 6 }}>
      <button type="button" className="btn" disabled={disabled || busy !== null} onClick={() => run('approve')}>
        {busy === 'approve' ? '승인 중…' : '이 후보로 연결'}
      </button>
      <button type="button" className="btn" disabled={disabled || busy !== null} onClick={() => run('reject')}>
        {busy === 'reject' ? '거절 중…' : '거절'}
      </button>
      {error && (
        <span role="alert" style={{ color: 'var(--trust-low)' }}>
          {error}
        </span>
      )}
    </div>
  );
}

export function UnlinkButton({ movieId }: { movieId: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    try {
      await postAction({ action: 'unlink', movieId });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : '요청에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="row" style={{ gap: 6, alignItems: 'center' }}>
      <button type="button" className="btn" disabled={busy} onClick={run}>
        {busy ? '해제 중…' : '연결 해제'}
      </button>
      {error && (
        <span role="alert" style={{ color: 'var(--trust-low)' }}>
          {error}
        </span>
      )}
    </div>
  );
}
