'use client';

import { useEffect } from 'react';
import { track } from '../src/analytics/analyticsClient';

/** 세션당 한 번만 app_opened를 기록한다 — 페이지 이동마다 다시 세지 않는다. */
export function AppOpenedTracker() {
  useEffect(() => {
    const KEY = 'cinefit_app_opened_tracked';
    if (sessionStorage.getItem(KEY)) return;
    sessionStorage.setItem(KEY, '1');
    track('app_opened', {});
  }, []);
  return null;
}
