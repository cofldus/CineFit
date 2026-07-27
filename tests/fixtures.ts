import type {
  CandidateShowtime,
  InfoStatus,
  MovieSpecKey,
  MovieWithSpecs,
  RecommendationRequest,
  SpecValue,
} from '../src/domain/recommendation/types';

export const NOW = new Date('2026-07-27T12:00:00+09:00');

export function spec<T>(value: T, overrides: Partial<SpecValue<T>> = {}): SpecValue {
  return {
    value,
    infoStatus: 'multi_source',
    observedAt: '2026-07-01',
    confidence: 0.85,
    sourceName: '테스트 출처',
    sourceUrl: null,
    ...overrides,
  } as SpecValue;
}

export function makeMovie(
  specs: Partial<Record<MovieSpecKey, SpecValue>>,
  overrides: Partial<MovieWithSpecs> = {},
): MovieWithSpecs {
  return {
    id: 1,
    title: '테스트 영화',
    originalTitle: 'Test Movie',
    runtimeMin: 150,
    director: '테스트 감독',
    rating: null,
    genres: ['드라마'],
    releaseYear: 2026,
    releaseStatus: 'domestic_release',
    specs,
    ...overrides,
  };
}

let seq = 1;

export function makeCandidate(overrides: {
  format?: CandidateShowtime['format'];
  supportedAr?: string | null;
  price?: number;
  lat?: number;
  lng?: number;
  specConfidence?: number;
  specStatus?: InfoStatus;
  screenWidthM?: number;
  soundFormat?: string;
  locStatus?: string;
} = {}): CandidateShowtime {
  const id = seq++;
  return {
    showtimeId: id,
    movieId: 1,
    startsAt: '2026-07-28T19:00:00+09:00',
    endsAtEst: '2026-07-28T21:50:00+09:00',
    format: overrides.format ?? 'imax',
    language: 'sub',
    priceAdult: overrides.price ?? 25_000,
    entryMethod: 'manual',
    dataCheckedAt: '2026-07-27T12:00:00+09:00',
    showtimeInfoStatus: 'estimated',
    isSynthetic: true,
    bookingUrl: null,
    verifiedAt: null,
    auditorium: {
      id,
      no: `${id}관`,
      brand: overrides.format ?? 'imax',
      seatCount: 300,
      status: 'operating',
      spec: {
        projector: { lightSource: 'laser', resolution: '4k', dual: true },
        screen: { widthM: overrides.screenWidthM ?? 25, aspect: '1.90' },
        sound: { format: overrides.soundFormat ?? 'imax_12ch', ceiling: true },
        supportedAr: overrides.supportedAr === undefined ? '1.43' : overrides.supportedAr,
        masking: 'none',
        notes: null,
        renewalEvent: null,
        infoStatus: overrides.specStatus ?? 'multi_source',
        observedAt: '2026-07-01',
        confidence: overrides.specConfidence ?? 0.85,
        sourceName: '테스트 출처',
        sourceUrl: null,
      },
    },
    location: {
      id,
      chain: '테스트체인',
      name: `테스트극장${id}`,
      lat: overrides.lat ?? 37.5299, // 기본: 서울시청에서 약 4km (용산 근사)
      lng: overrides.lng ?? 126.9648,
      status: overrides.locStatus ?? 'operating',
      transitNote: '테스트역 인근',
    },
  };
}

export function makeRequest(overrides: Partial<RecommendationRequest> = {}): RecommendationRequest {
  return {
    movieId: 1,
    origin: { lat: 37.5665, lng: 126.978, label: '서울시청 인근' },
    date: '2026-07-28',
    maxTravelMinutes: 60,
    maxPrice: 40_000,
    priority: 'balance',
    allowImax: true,
    allowDolby: true,
    allowStandard: true,
    motionSickness: 0,
    subtitleReadability: false,
    neckComfort: false,
    wheelchair: false,
    ...overrides,
  };
}
