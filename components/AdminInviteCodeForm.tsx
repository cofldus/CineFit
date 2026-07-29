'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export interface AdminInviteCodeRow {
  id: number;
  code: string;
  description: string | null;
  maxUses: number | null;
  useCount: number;
  expiresAt: string | null;
  active: boolean;
  createdBy: string;
  createdAt: string;
}

export function AdminInviteCodeCreateForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const form = e.currentTarget; // await 이후 e.currentTarget은 null이 될 수 있어 미리 잡아둔다
    const fd = new FormData(form);
    try {
      const res = await fetch('/api/admin/invite-codes', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          code: fd.get('code') || undefined,
          description: fd.get('description') || undefined,
          maxUses: fd.get('maxUses') || null,
          expiresAt: fd.get('expiresAt') || null,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? '생성에 실패했습니다.');
      form.reset();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : '생성에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card" aria-label="새 초대 코드">
      <div className="row">
        <label className="field" style={{ flex: 1, minWidth: 140 }}>
          <span>코드(비우면 자동 생성)</span>
          <input name="code" />
        </label>
        <label className="field" style={{ flex: 2, minWidth: 180 }}>
          <span>설명</span>
          <input name="description" />
        </label>
        <label className="field" style={{ minWidth: 100 }}>
          <span>사용 한도(비우면 무제한)</span>
          <input name="maxUses" type="number" min={1} />
        </label>
        <label className="field" style={{ minWidth: 160 }}>
          <span>만료일(비우면 없음)</span>
          <input name="expiresAt" type="date" />
        </label>
      </div>
      {error && (
        <p role="alert" style={{ color: 'var(--trust-low)' }}>
          {error}
        </p>
      )}
      <button type="submit" className="btn" disabled={busy}>
        생성
      </button>
    </form>
  );
}

export function AdminInviteCodeToggle({ inviteCode }: { inviteCode: AdminInviteCodeRow }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/invite-codes/${inviteCode.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ active: !inviteCode.active }),
      });
      if (!res.ok) throw new Error('변경에 실패했습니다.');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : '변경에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="row" style={{ alignItems: 'center', gap: 8 }}>
      <button type="button" className="btn" onClick={toggle} disabled={busy}>
        {inviteCode.active ? '비활성화' : '다시 활성화'}
      </button>
      {error && (
        <span role="alert" style={{ color: 'var(--trust-low)' }}>
          {error}
        </span>
      )}
    </div>
  );
}
