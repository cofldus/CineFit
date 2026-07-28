'use client';

import { apiAnalyticsProvider } from './analyticsProvider';
import type { AnalyticsEventName, AnalyticsEventProperties } from './analyticsEvents';

/** 클라이언트 컴포넌트에서 쓰는 유일한 진입점 — 타입이 이벤트별 속성 스키마를 강제한다. */
export function track<E extends AnalyticsEventName>(eventName: E, properties: AnalyticsEventProperties<E>): void {
  apiAnalyticsProvider.track(eventName, properties);
}
