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

// 추천 폼과 경량 온보딩(components/OnboardingCard.tsx)이 공유하는 선택지 — 값이 갈리면
// 온보딩에서 고른 답이 추천 폼 기본값과 어긋나므로 한 곳에서만 정의한다.
// R19: 우선순위 5축. 구 'logistics' 값은 저장된 URL·온보딩 답 재현용으로만 파서가 허용한다.
export const PRIORITY_OPTIONS = [
  { value: 'quality', label: '가장 좋은 화면과 사운드' },
  { value: 'seat', label: '편안하고 보기 좋은 좌석' },
  { value: 'distance', label: '가까운 영화관' },
  { value: 'price', label: '합리적인 가격' },
  { value: 'balance', label: '전체적인 균형' },
] as const;

// 두 번째 우선 기준(선택) — 가중치 블렌드 20%.
export const PRIORITY_SECONDARY_OPTIONS = [
  { value: 'none', label: '없음' },
  { value: 'quality', label: '화면과 사운드' },
  { value: 'seat', label: '좌석' },
  { value: 'distance', label: '이동 편의' },
  { value: 'price', label: '가격' },
] as const;

// R19 Step 1: 희망 "상영 시작" 시간대 — 회차 시작 시각 기준 하드 필터.
export const TIME_WINDOW_OPTIONS = [
  { value: 'any', label: '시간 상관없음' },
  { value: 'morning', label: '오전', hint: '05–12시' },
  { value: 'afternoon', label: '오후', hint: '12–17시' },
  { value: 'evening', label: '저녁', hint: '17–22시' },
  { value: 'late', label: '심야', hint: '22시 이후' },
] as const;

// R19 Step 1: 극장까지 "편도" 이동 한도 — preset이 기본, 직접 입력은 보조.
export const TRAVEL_LIMIT_OPTIONS = [
  { value: 30, label: '30분 이내' },
  { value: 45, label: '45분 이내' },
  { value: 60, label: '60분 이내' },
  { value: 90, label: '90분까지' },
  { value: 240, label: '거리 상관없음' },
] as const;

// R19 Step 2: 절대 예산 대신 "더 좋은 상영 환경을 위한 추가 지불 의향".
// 실효 가격 상한은 서비스가 (일반관 최저가 + 의향)으로 파생시킨다.
export const PREMIUM_ALLOWANCE_OPTIONS = [
  { value: 'price_first', label: '가격이 가장 중요해요', hint: '일반관 수준까지만' },
  { value: 'plus_5000', label: '일반관보다 5천 원까지', hint: '+5,000원' },
  { value: 'plus_10000', label: '1만 원까지 더 낼 수 있어요', hint: '+10,000원' },
  { value: 'experience_first', label: '가격보다 관람 환경이 중요해요', hint: '상한 없음' },
] as const;

export const MOTION_OPTIONS = [
  { value: '0', label: '괜찮아요' },
  { value: '1', label: '조금 신경 쓰여요' },
  { value: '2', label: '많이 힘들어요' },
] as const;
