// Design Lab 3개 시안이 공유하는 하드코딩 데모 콘텐츠 — 실제 DB/API에 연결하지 않는다
// (§2 "기존 앱 기능과 API를 연결할 필요는 없습니다"). 텍스트는 동일하지만 각 시안의 배치·
// 구조는 서로 완전히 달라야 한다(§4).

export const SERVICE_STATEMENT =
  'CineFit은 화면비, 사운드, 좌석, 이동 시간과 가격을 함께 비교해 현재 조건에 가장 맞는 상영관을 추천합니다.';

export type LabMovie = {
  id: string;
  title: string;
  year: number;
  ratio: number;
  ratioLabel: string;
  formats: string[];
  note: string;
};

export const LAB_MOVIES: LabMovie[] = [
  {
    id: 'dune-2',
    title: '듄: 파트 2',
    year: 2026,
    ratio: 2.39,
    ratioLabel: '2.39:1',
    formats: ['IMAX', 'Dolby Cinema'],
    note: '넓은 화면비를 실제로 살리는 상영관인지가 관건입니다.',
  },
  {
    id: 'oppenheimer',
    title: '오펜하이머',
    year: 2026,
    ratio: 2.2,
    ratioLabel: '2.20:1',
    formats: ['IMAX', 'Dolby Cinema'],
    note: 'IMAX 필름 상영관과 일반 디지털관의 체감 차이가 가장 큰 작품입니다.',
  },
  {
    id: 'zone-of-interest',
    title: '존 오브 인터레스트',
    year: 2026,
    ratio: 1.85,
    ratioLabel: '1.85:1',
    formats: ['일반관', 'Dolby Cinema'],
    note: '화면보다 사운드 설계가 관람 경험을 좌우하는 작품입니다.',
  },
];

export const CRITERIA = [
  { label: '영화와 포맷의 궁합', detail: '화면비·촬영 포맷이 이 상영관 스크린과 맞는지' },
  { label: '상영관의 실제 설비', detail: '영사기·사운드·마스킹이 실제로 확인됐는지' },
  { label: '현재 남은 좌석의 품질', detail: '몰입·자막 가독·멀미 완화 등 목적별 구역' },
  { label: '거리·시간·가격', detail: '지금 실제로 갈 수 있는 선택인지' },
] as const;

export const TRUST_LEVELS = [
  { label: '공식 확인', detail: '배급사·극장 공식 자료' },
  { label: '복수 출처 확인', detail: '서로 다른 출처가 일치' },
  { label: '사용자 제보', detail: '관람객이 직접 확인' },
  { label: '추정', detail: '확인 전, 참고용' },
] as const;

// 데모용 추천 결과 스니펫 — 세 시안 모두 "추천이 어떻게 느껴지는지"를 보여줄 때 이 값을 쓴다.
export const DEMO_RESULT = {
  cinema: 'CGV 용산아이파크몰 IMAX관',
  format: 'IMAX',
  distanceMin: 24,
  price: 30000,
  matchPercent: 96,
};
