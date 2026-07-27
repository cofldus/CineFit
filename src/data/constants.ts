// 합성 시드가 회차를 갖는 날짜 (spikes/minimal-db/seed.mjs 와 동기)
// 기준 시각은 src/lib/clock.ts(getAppClock)가 담당한다 — DEMO_NOW 고정값은 제거됨.
export const DEMO_DATE = '2026-07-28';

// 출발 위치 프리셋 (정확 좌표 수집 대신 지역 프리셋 — 문서 05 §2 위치 축소 원칙)
export const ORIGIN_PRESETS = [
  { id: 'cityhall', label: '서울시청 인근', lat: 37.5665, lng: 126.978 },
  { id: 'gangnam', label: '강남역 인근', lat: 37.4979, lng: 127.0276 },
  { id: 'hongdae', label: '홍대입구 인근', lat: 37.557, lng: 126.9236 },
  { id: 'yeouido', label: '여의도 인근', lat: 37.5219, lng: 126.9245 },
  { id: 'cheonho', label: '천호역 인근', lat: 37.5385, lng: 127.1237 },
  { id: 'nowon', label: '노원역 인근', lat: 37.6542, lng: 127.0568 },
] as const;

export type OriginId = (typeof ORIGIN_PRESETS)[number]['id'];
