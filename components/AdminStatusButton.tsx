'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function AdminStatusButton({ showtimeId, status }: { showtimeId: number; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const next = status === 'active' ? 'disabled' : 'active';

  async function toggle() {
    setBusy(true);
    await fetch(`/api/admin/showtimes/${showtimeId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: next }),
    });
    router.refresh();
    setBusy(false);
  }

  return (
    <button type="button" className="btn" onClick={toggle} disabled={busy}>
      {busy ? '변경 중…' : status === 'active' ? '비활성화' : '다시 활성화'}
    </button>
  );
}
