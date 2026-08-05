'use client';

// R21 — 분석 이벤트 중복 전송 방지. 같은 key로는 브라우저 세션(탭)당 한 번만 보낸다.
// sessionStorage 실패(사생활 모드 등) 시엔 메모리 가드로 폴백해 최소한 같은 페이지
// 수명 안에서는 중복을 막는다.
import { track } from './analyticsClient';
import type { AnalyticsEventName, AnalyticsEventProperties } from './analyticsEvents';

const memoryGuard = new Set<string>();

export function trackOnce<E extends AnalyticsEventName>(
  key: string,
  event: E,
  properties: AnalyticsEventProperties<E>,
): void {
  const storageKey = `cinefit_evt_${key}`;
  if (memoryGuard.has(storageKey)) return;
  memoryGuard.add(storageKey);
  try {
    if (sessionStorage.getItem(storageKey)) return;
    sessionStorage.setItem(storageKey, '1');
  } catch {
    /* 저장 불가 시 메모리 가드만으로 동작 */
  }
  track(event, properties);
}
