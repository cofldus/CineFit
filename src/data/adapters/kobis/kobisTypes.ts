// KOBIS 어댑터 타입
// 원칙: showTypes는 "KOBIS가 등록한 상영 형태"라는 사실만 의미한다.
// 실제 상영 여부, 확장 화면비, Atmos/Vision 존재, 예매 가능 여부로 확대 해석 금지.

export type KobisNormalizedFormat = 'imax' | 'dolby_cinema' | '4dx' | 'screenx' | 'standard' | '3d';

export interface KobisFormatEntry {
  raw: string; // 예: "IMAX/IMAX" — 원문 그대로
  normalized: KobisNormalizedFormat | null; // 매핑 불가 시 null (버리지 않고 raw 보존)
}

export interface NormalizedKobisMovie {
  kobisCode: string;
  title: string;
  titleEn: string | null;
  runtimeMin: number | null;
  prodYear: number | null;
  openDate: string | null; // YYYY-MM-DD
  genres: string[];
  directors: string[];
  rating: string | null;
  formats: KobisFormatEntry[];
}

export interface KobisBoxOfficeEntry {
  kobisCode: string;
  title: string;
  rank: number | null;
  openDate: string | null;
}

export interface SyncCounts {
  fetched: number;
  created: number;
  updated: number;
  unchanged: number;
  errors: number;
  duplicates: number;
}
