'use client';

import Link from 'next/link';
import type { ComponentProps } from 'react';
import { track } from '../src/analytics/analyticsClient';
import type { AnalyticsEventName, AnalyticsEventProperties } from '../src/analytics/analyticsEvents';

/** 서버 컴포넌트 안에서도 쓸 수 있는 클릭 추적 링크 — next/link를 그대로 감싼다.
 * 분석 실패가 네비게이션을 막지 않는다(analyticsClient가 이미 fire-and-forget). */
export function TrackedLink<E extends AnalyticsEventName>({
  event,
  eventProperties,
  ...linkProps
}: { event: E; eventProperties: AnalyticsEventProperties<E> } & ComponentProps<typeof Link>) {
  return <Link {...linkProps} onClick={() => track(event, eventProperties)} />;
}

/** 외부(공식 예매 페이지 등) 링크용 — next/link가 아닌 일반 <a>를 감싼다. */
export function TrackedExternalLink<E extends AnalyticsEventName>({
  event,
  eventProperties,
  ...anchorProps
}: { event: E; eventProperties: AnalyticsEventProperties<E> } & ComponentProps<'a'>) {
  return <a {...anchorProps} onClick={() => track(event, eventProperties)} />;
}
