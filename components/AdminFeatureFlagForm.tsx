'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export interface AdminFeatureFlagRow {
  key: string;
  enabled: boolean;
  description: string | null;
  updatedAt: string;
  updatedBy: string | null;
}

async function setFlag(key: string, enabled: boolean, description?: string | null) {
  const res = await fetch('/api/admin/feature-flags', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ key, enabled, description: description ?? undefined }),
  });
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(body.error ?? '저장에 실패했습니다.');
}

export function AdminFeatureFlagToggle({ flag }: { flag: AdminFeatureFlagRow }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setBusy(true);
    setError(null);
    try {
      await setFlag(flag.key, !flag.enabled, flag.description);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="row" style={{ alignItems: 'center', gap: 8 }}>
      <button type="button" className="btn" onClick={toggle} disabled={busy}>
        {flag.enabled ? '끄기' : '켜기'}
      </button>
      {error && (
        <span role="alert" style={{ color: 'var(--trust-low)' }}>
          {error}
        </span>
      )}
    </div>
  );
}

export function AdminFeatureFlagCreateForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    try {
      await setFlag(String(fd.get('key') ?? '').trim(), fd.get('enabled') === 'on', String(fd.get('description') ?? ''));
      e.currentTarget.reset();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card" aria-label="새 기능 플래그">
      <div className="row">
        <label className="field" style={{ flex: 1, minWidth: 160 }}>
          <span>키 (예: onboarding)</span>
          <input name="key" required pattern="[a-z][a-z0-9_]{1,63}" />
        </label>
        <label className="field" style={{ flex: 2, minWidth: 220 }}>
          <span>설명</span>
          <input name="description" />
        </label>
        <label className="field" style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 100 }}>
          <input type="checkbox" name="enabled" /> 켜기
        </label>
      </div>
      {error && (
        <p role="alert" style={{ color: 'var(--danger, #c0392b)' }}>
          {error}
        </p>
      )}
      <button type="submit" className="btn" disabled={busy}>
        추가
      </button>
    </form>
  );
}
