// 분석 "제공자" 인터페이스 — 지금은 자체 API(/api/analytics/events)로만 보내지만, 나중에
// 외부 분석 도구를 붙이더라도 analyticsClient.ts 호출부는 바꿀 필요가 없게 격리한다.
export interface AnalyticsProvider {
  track(eventName: string, properties: Record<string, unknown>): void;
}

/** 자체 API 기반 제공자 — 실패해도 사용자 흐름을 절대 막지 않는다(fire-and-forget). */
export const apiAnalyticsProvider: AnalyticsProvider = {
  track(eventName, properties) {
    void fetch('/api/analytics/events', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ event: eventName, properties }),
      keepalive: true,
    }).catch(() => {
      // 분석 실패는 조용히 무시 — 사용자에게 노출하거나 흐름을 막지 않는다
    });
  },
};
