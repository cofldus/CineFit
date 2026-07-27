'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // 등록 실패는 치명적이지 않음 — 온라인 동작에는 영향 없음
      });
    }
  }, []);
  return null;
}
