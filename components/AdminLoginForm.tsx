'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function AdminLoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const password = String(new FormData(e.currentTarget).get('password') ?? '');
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      router.push('/admin');
      router.refresh();
    } else {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? '로그인에 실패했습니다.');
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} aria-label="관리자 로그인">
      <label className="field">
        <span>관리자 비밀번호</span>
        <input type="password" name="password" required autoComplete="current-password" />
      </label>
      {error ? (
        <p role="alert" className="sub" style={{ color: 'var(--trust-low)' }}>
          {error}
        </p>
      ) : null}
      <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
        {busy ? '확인 중…' : '로그인'}
      </button>
    </form>
  );
}
