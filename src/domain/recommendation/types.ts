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

export type FormatId = 'imax' | 'dolby_cinema' | '4dx' | 'superplex' | 'standard';
export type Priority = 'balance' | 'quality' | 'logistics';

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
  auditorium: {
    id: number;
    no: string;
    brand: string;
    seatCount: number | null;
    status: string;
    spec: AuditoriumSpec | null;
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
  maxTravelMinutes: number;
  maxPrice: number;
  priority: Priority;
  allowImax: boolean;
  allowDolby: boolean;
  allowStandard: boolean; // 일반관·수퍼플렉스(대형 일반) 그룹
  motionSickness: 0 | 1 | 2; // 2면 4DX 하드 제외 (문서 05 §3)
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

export interface ScoredCandidate {
  candidate: CandidateShowtime;
  travelMinutes: number;
  axes: { ffm: number; audQ: number; pm: number; seatQ: number; conv: number; pv: number; dc: number; fr: number };
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

export interface ExcludedCandidate {
  candidate: CandidateShowtime;
  reason: string;
}

export type PickLabel = '균형' | '품질' | '근접·가성비';

export interface RecommendationResult {
  movie: MovieWithSpecs;
  request: RecommendationRequest;
  weights: Weights;
  totalCandidates: number;
  excluded: ExcludedCandidate[];
  picks: { label: PickLabel; scored: ScoredCandidate }[];
  scored: ScoredCandidate[];
}
