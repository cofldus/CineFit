// 추천 도메인 타입 — 문서 05(추천 엔진)·06(데이터 설계)의 축소 구현
export type InfoStatus =
  | 'official'
  | 'multi_source'
  | 'user_report'
  | 'single_unverified'
  | 'estimated'
  | 'rumor'
  | 'outdated'
  | 'conflict';

// R21: 'mx4d'는 아직 운영 데이터에 없지만, 모션 시트 capability 확장 경로를 검증하기
// 위해 타입·capability registry에 미리 등록한다(formatCapabilities.ts).
export type FormatId = 'imax' | 'dolby_cinema' | '4dx' | 'mx4d' | 'superplex' | 'standard';
// R19: 우선순위 5축 — seat(좌석)·distance(이동)·price(가격)가 1급으로 승격됐다.
// 'logistics'는 과거 실행 기록·저장된 URL 재현을 위해 값으로는 계속 허용한다.
export type Priority = 'balance' | 'quality' | 'seat' | 'distance' | 'price' | 'logistics';

// 희망 상영 "시작 시간대"(R19 Step 1) — 회차 시작 시각 기준의 하드 필터.
export type TimeWindow = 'any' | 'morning' | 'afternoon' | 'evening' | 'late' | 'custom';

export interface SpecValue<T = unknown> {
  value: T;
  infoStatus: InfoStatus;
  observedAt: string;
  confidence: number;
  sourceName: string | null;
  sourceUrl: string | null;
}

export type MovieSpecKey =
  | 'native_ar'
  | 'imax_expanded_ar'
  | 'filmed_for_imax'
  | 'film_format'
  | 'atmos_mix'
  | 'imax_sound_mix'
  | 'dolby_vision'
  | 'dark_scene_ratio'
  | 'genre_spectacle'
  | 'format_versions';

export interface MovieWithSpecs {
  id: number;
  title: string;
  originalTitle: string | null;
  runtimeMin: number;
  director: string | null;
  rating: string | null;
  genres: string[];
  releaseYear: number | null;
  releaseStatus: string | null;
  /** KMDb 공식 API posters 필드의 첫 URL — 없으면 null */
  posterUrl: string | null;
  specs: Partial<Record<MovieSpecKey, SpecValue>>;
}

export interface AuditoriumSpec {
  projector: { lightSource?: string; resolution?: string; imaxGrade?: string; dolbyVision?: boolean; dual?: boolean } | null;
  screen: { widthM?: number; heightM?: number; aspect?: string; curved?: boolean } | null;
  sound: { format?: string; ceiling?: boolean } | null;
  supportedAr: string | null; // 관이 실제 표시 가능한 최대 확장 화면비
  masking: string | null;
  notes: string | null;
  renewalEvent: string | null;
  infoStatus: InfoStatus;
  observedAt: string;
  confidence: number;
  sourceName: string | null;
  sourceUrl: string | null;
}

// 목적별 좌석 구역 — 단일 "명당" 없음 (docs/06 §3.2). official 불가, 제보·추정 위주.
export interface SeatZone {
  purposes: string[]; // immersive/overview/subtitle/sound/low_motion/neck_easy/exit_easy/pair/wheelchair
  rowRange: string | null;
  colRange: string | null;
  rationale: string | null;
  infoStatus: InfoStatus;
  observedAt: string;
  confidence: number;
  sourceName: string | null;
  /** 관리자 검수 시각 (사용자 제보 승격분) */
  reviewedAt?: string | null;
  /** 적용 시작일 — 승격 lineage */
  validFrom?: string | null;
  /** 대체된 존의 id — null이면 최초 등록 */
  supersedesSeatZoneId?: number | null;
}

export interface CandidateShowtime {
  showtimeId: number;
  movieId: number;
  startsAt: string;
  endsAtEst: string;
  format: FormatId;
  language: string | null;
  priceAdult: number;
  entryMethod: string;
  dataCheckedAt: string;
  showtimeInfoStatus: InfoStatus;
  isSynthetic: boolean; // 검증용 합성 회차 여부 — 화면에서 관리자 확인 회차와 구분 표기
  bookingUrl: string | null; // 공식 예매 딥링크
  verifiedAt: string | null; // 관리자 확인 시각
  /** R21.1 — 확인한 공식 페이지 URL(실회차는 공식 도메인 필수) */
  sourceUrl: string | null;
  /** R21.1 — 만료 시각(없으면 시작 시각 기준) */
  expiresAt: string | null;
  /** R21.1 — verified | unverified | expired */
  verificationStatus: string;
  auditorium: {
    id: number;
    no: string;
    brand: string;
    seatCount: number | null;
    status: string;
    spec: AuditoriumSpec | null;
    seatZones: SeatZone[];
  };
  location: {
    id: number;
    chain: string;
    name: string;
    lat: number;
    lng: number;
    status: string;
    transitNote: string | null;
  };
}

export interface RecommendationRequest {
  movieId: number;
  origin: { lat: number; lng: number; label?: string };
  date: string; // YYYY-MM-DD
  /** 희망 상영 시작 시간대(R19) — 회차 "시작 시각" 기준 하드 필터. */
  timeWindow?: TimeWindow;
  /** timeWindow='custom'일 때의 시작 시각 범위(HH:MM, Asia/Seoul). */
  timeFrom?: string;
  timeTo?: string;
  /** 극장까지 "편도" 이동 한도(분). */
  maxTravelMinutes: number;
  /** 절대 가격 상한(하드 필터) — 구 URL 호환 전용. 새 플로우는 항상
      Number.MAX_SAFE_INTEGER(사실상 없음)를 넣는다. R20: 가격은 soft preference라
      추가 지불 의향으로는 후보를 제외하지 않는다. */
  maxPrice: number;
  /** 가격 soft 기준(R20) — 일반관 최저가 + 추가 지불 의향. 이 값을 넘는 후보는
      제외하지 않고 가격 축 점수만 감점한다. null이면 기준 없음(가격 차이 크게 미반영). */
  priceRef?: number | null;
  /** 더 좋은 상영 환경을 위한 추가 지불 의향(R19 Step 2) — 표시·기록용 원본 값. */
  premiumAllowance?: 'price_first' | 'plus_5000' | 'plus_10000' | 'experience_first';
  priority: Priority;
  /** 두 번째 우선 기준(선택) — 가중치 블렌드에만 쓰인다. */
  prioritySecondary?: 'none' | 'quality' | 'seat' | 'distance' | 'price';
  allowImax: boolean;
  allowDolby: boolean;
  allowStandard: boolean; // 일반관·수퍼플렉스(대형 일반) 그룹
  /** 큰 화면 멀미(R20) — IMAX 등 대형 화면을 "제외"하지 않고 화면 축 점수만 감점한다. */
  avoidBigScreen?: boolean;
  motionSickness: 0 | 1 | 2; // 2면 4DX(모션 시트) 하드 제외 (문서 05 §3)
  subtitleReadability: boolean;
  neckComfort: boolean;
  wheelchair: boolean; // 하드 필터 — 미확인 관도 제외 (문서 05 §3)
}

export interface Weights {
  W1: number; W2: number; W3: number; W4: number;
  W5: number; W6: number; W7: number; W8: number;
}

export interface Citation {
  what: string;
  sourceName: string; // '출처 없음' 포함
  sourceUrl: string | null;
  observedAt: string;
  infoStatus: InfoStatus;
}

export interface SeatZoneSuggestion {
  zone: string;
  rationale: string[];
  label: '추정'; // 좌석 존 데이터 미수집 — 항상 추정 (문서 05 §4.4)
}

/** R21 trace — soft preference 감점 기록(제외가 아니라 점수 차감). */
export interface SoftPenalty {
  type: 'price_over_ref' | 'big_screen';
  /** 차감된 점수량(해당 축 0~1 스케일) */
  amount: number;
  note: string;
}

export interface ScoredCandidate {
  candidate: CandidateShowtime;
  travelMinutes: number;
  axes: { ffm: number; audQ: number; pm: number; seatQ: number; conv: number; pv: number; dc: number; fr: number };
  /** R21 trace — 이 후보에 적용된 soft 감점 목록 */
  softPenalties: SoftPenalty[];
  quality: number;
  logistics: number;
  base: number;
  trust: number;
  final: number;
  confidenceLabel: '높음' | '보통' | '낮음';
  pros: string[];
  cons: string[];
  uncertainties: string[];
  seatZone: SeatZoneSuggestion;
  citations: Citation[];
}

/** R21 trace — 하드 필터 단계 식별자(퍼널 전후 카운트 집계용).
 * 'verification'은 R21.1 verified-only 게이트(합성·미검증·만료·source 무효·stale). */
export type ExclusionStage =
  | 'verification'
  | 'version'
  | 'operating'
  | 'format_allowed'
  | 'motion_seat'
  | 'time_window'
  | 'travel'
  | 'price_cap'
  | 'wheelchair';

export interface ExcludedCandidate {
  candidate: CandidateShowtime;
  reason: string;
  /** 어떤 하드 필터에서 제외됐는지 — trace 퍼널 집계용(R21) */
  stage?: ExclusionStage;
}

export type PickLabel = '균형' | '품질' | '근접·가성비';

export interface RecommendationResult {
  movie: MovieWithSpecs;
  request: RecommendationRequest;
  weights: Weights;
  totalCandidates: number;
  /** R21.1 — verified-only 게이트 통과 후보 수(서비스 계층에서 설정, 엔진 단독 실행 시 없음) */
  eligibleCandidates?: number;
  excluded: ExcludedCandidate[];
  picks: { label: PickLabel; scored: ScoredCandidate }[];
  scored: ScoredCandidate[];
  /** 데이터 구분: 관리자 확인 회차가 있으면 합성 회차는 기본 제외된다 (서비스 계층에서 설정) */
  dataMode?: {
    usedSynthetic: boolean;
    syntheticSuppressed: number; // 검증 회차 우선으로 제외된 합성 회차 수
  };
  /** 이 실행의 recommendation_runs 행 id — 피드백·선택·관람후 평가가 참조 (서비스 계층에서 설정) */
  runId?: number;
  /** 추천 계산에 걸린 시간(ms) — 분석 이벤트에 그대로 실어 보낸다 (서비스 계층에서 설정) */
  latencyMs?: number;
}
