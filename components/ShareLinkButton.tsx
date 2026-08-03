'use client';

import { useState } from 'react';

// 결과 공유(R15 §6 다음 행동) — 현재 결과 URL(조건이 쿼리에 다 들어 있음)을 클립보드에
// 복사한다. 별도 공유 서버 없이 링크만으로 같은 결과가 재현된다.
export function ShareLinkButton({ className }: { className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(window.location.href);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          /* 클립보드 권한 거부 시 조용히 무시 — 주소창에서 직접 복사 가능 */
        }
      }}
    >
      {copied ? '링크 복사됨 ✓' : '결과 링크 복사'}
    </button>
  );
}
