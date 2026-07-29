'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function AdminPrivacyRequestActions({ requestId, status }: { requestId: number; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState('');

  if (status !== 'pending') {
    return <p className="sub">이미 처리된 요청입니다 — 상태: {status}</p>;
  }

  async function send(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/privacy-requests/${requestId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? '처리에 실패했습니다.');
    } else {
      router.refresh();
    }
    setBusy(false);
  }

  return (
    <div className="card" aria-label="개인정보 삭제 요청 처리">
      {error ? (
        <p className="notice" role="alert">
          {error}
        </p>
      ) : null}
      <label className="field">
        <span>반려 사유(선택 — 반려 시에만 기록)</span>
        <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="예: 세션 id가 존재하지 않음" />
      </label>
      <div className="row">
        <button type="button" className="btn btn-primary" disabled={busy} onClick={() => send({ action: 'complete' })}>
          삭제 실행
        </button>
        <button type="button" className="btn" disabled={busy} onClick={() => send({ action: 'reject', note: note || undefined })}>
          반려
        </button>
      </div>
    </div>
  );
}
