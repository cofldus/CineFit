'use client';

import { useState } from 'react';

const inputCls =
  'min-h-[52px] w-full rounded-card border border-border bg-bg px-3.5 text-base text-text outline-none transition-shadow focus-visible:border-primary-strong focus-visible:ring-[3px] focus-visible:ring-primary-soft';
const sectionCls = 'rounded-card-lg border border-border bg-surface p-5';

type Phase = { kind: 'editing' } | { kind: 'submitting' } | { kind: 'done' } | { kind: 'error'; message: string };

function SubmitButton({ busy, label }: { busy: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="mt-4 flex min-h-12 w-full items-center justify-center rounded-card bg-primary-strong text-sm font-semibold text-white transition-colors hover:bg-primary-strong-hover disabled:opacity-60"
    >
      {busy ? '요청 중…' : label}
    </button>
  );
}

export function SessionDeletionForm() {
  const [phase, setPhase] = useState<Phase>({ kind: 'editing' });

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPhase({ kind: 'submitting' });
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch('/api/privacy/delete-my-data', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: String(fd.get('message') ?? ''), website: String(fd.get('website') ?? '') }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? '요청에 실패했습니다.');
      setPhase({ kind: 'done' });
    } catch (err) {
      setPhase({ kind: 'error', message: err instanceof Error ? err.message : '요청에 실패했습니다.' });
    }
  }

  if (phase.kind === 'done') {
    return (
      <div className={sectionCls} role="status">
        <h2 className="m-0 text-base font-bold text-text">요청이 접수됐어요</h2>
        <p className="mt-2 text-sm text-text-sub">관리자가 확인한 뒤 지금 쓰고 계신 기기의 이용 데이터를 지워요.</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className={sectionCls} aria-label="내 이용 데이터 삭제 요청">
      <h2 className="m-0 text-base font-bold text-text">내 이용 데이터 삭제 요청</h2>
      <p className="mt-1.5 text-sm text-text-sub">
        지금 이 기기(브라우저)의 세션 쿠키에 연결된 분석 이벤트·추천 피드백·설문 응답을 지워요.
        본인 확인 절차 없이 지금 쓰고 계신 세션만 대상이 됩니다.
      </p>
      <label className="mt-3 block">
        <span className="text-sm font-semibold text-text">남기고 싶은 말 (선택)</span>
        <input className={`${inputCls} mt-1.5`} type="text" name="message" maxLength={500} />
      </label>
      <div aria-hidden className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden">
        <label>
          웹사이트 <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      {phase.kind === 'error' ? (
        <p role="alert" className="mt-2 text-sm text-trust-low">
          {phase.message}
        </p>
      ) : null}
      <SubmitButton busy={phase.kind === 'submitting'} label="삭제 요청 보내기" />
    </form>
  );
}

export function EmailDeletionForm() {
  const [phase, setPhase] = useState<Phase>({ kind: 'editing' });

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPhase({ kind: 'submitting' });
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch('/api/privacy/delete-request', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          contactEmail: String(fd.get('contactEmail') ?? ''),
          message: String(fd.get('message') ?? ''),
          website: String(fd.get('website') ?? ''),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; details?: string[] };
      if (!res.ok) throw new Error(data.details?.join(' / ') ?? data.error ?? '요청에 실패했습니다.');
      setPhase({ kind: 'done' });
    } catch (err) {
      setPhase({ kind: 'error', message: err instanceof Error ? err.message : '요청에 실패했습니다.' });
    }
  }

  if (phase.kind === 'done') {
    return (
      <div className={sectionCls} role="status">
        <h2 className="m-0 text-base font-bold text-text">요청이 접수됐어요</h2>
        <p className="mt-2 text-sm text-text-sub">관리자가 확인한 뒤 이 이메일이 남겨진 제보에서 이메일만 지워요(제보 내용은 유지돼요).</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className={sectionCls} aria-label="제보에 남긴 이메일 삭제 요청">
      <h2 className="m-0 text-base font-bold text-text">제보에 남긴 이메일 삭제 요청</h2>
      <p className="mt-1.5 text-sm text-text-sub">
        상영관 정보 제보 폼에 남긴 연락 이메일을 지워요. 제보 내용(상영관 사양 등) 자체는 그대로
        남습니다.
      </p>
      <label className="mt-3 block">
        <span className="text-sm font-semibold text-text">제보에 남긴 이메일</span>
        <input className={`${inputCls} mt-1.5`} type="email" name="contactEmail" required />
      </label>
      <label className="mt-3 block">
        <span className="text-sm font-semibold text-text">남기고 싶은 말 (선택)</span>
        <input className={`${inputCls} mt-1.5`} type="text" name="message" maxLength={500} />
      </label>
      <div aria-hidden className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden">
        <label>
          웹사이트 <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      {phase.kind === 'error' ? (
        <p role="alert" className="mt-2 text-sm text-trust-low">
          {phase.message}
        </p>
      ) : null}
      <SubmitButton busy={phase.kind === 'submitting'} label="삭제 요청 보내기" />
    </form>
  );
}
