'use client';

// R21 — 펼침(details) 추적 래퍼. 처음 "열릴 때" 한 번만 이벤트를 보낸다(중복 방지).
// DOM 구조는 일반 <details>와 동일해 스타일·시각 회귀에 영향이 없다.
import { useRef, type ComponentProps } from 'react';
import { track } from '../src/analytics/analyticsClient';
import type { AnalyticsEventName, AnalyticsEventProperties } from '../src/analytics/analyticsEvents';

export function TrackedDetails<E extends AnalyticsEventName>({
  event,
  eventProperties,
  children,
  ...detailsProps
}: { event: E; eventProperties: AnalyticsEventProperties<E> } & ComponentProps<'details'>) {
  const sent = useRef(false);
  return (
    <details
      {...detailsProps}
      onToggle={(e) => {
        if ((e.target as HTMLDetailsElement).open && !sent.current) {
          sent.current = true;
          track(event, eventProperties);
        }
      }}
    >
      {children}
    </details>
  );
}
