// KMDb(한국영상자료원) 어댑터 타입
// 원칙: KMDb가 실제로 채워 보낸 필드만 사실로 취급한다. 화면비·IMAX 확장비·Atmos 믹스처럼
// 해석이 필요한 값은 KMDb 응답을 그대로 옮기는 것과 "우리 큐레이션 vocabulary(native_ar 등)로
// 확정한다"는 것이 다른 일이다 — 이 어댑터는 전자만 한다(kmdb_screen_area 같은 KMDb 전용
// spec_key로 저장, 기존 native_ar/atmos_mix 등을 덮어쓰거나 대신 채우지 않는다).

export interface KmdbTechnicalField {
  key: 'screen_area' | 'sound_echo' | 'f_sound';
  rawValue: string; // KMDb 원문 그대로(해석 없음)
}

export interface NormalizedKmdbMovie {
  docId: string;
  title: string;
  titleEng: string | null;
  prodYear: number | null;
  runtimeMin: number | null;
  repRlsDate: string | null; // YYYY-MM-DD, 형식이 다르면 null(추정 금지)
  directors: string[];
  rating: string | null;
  plotSummary: string | null;
  posterUrl: string | null; // posters 필드의 첫 URL(https 승격) — 없으면 null(추정 금지)
  technicalFields: KmdbTechnicalField[]; // 비어있지 않은 필드만
}

export interface KmdbSearchCandidate {
  docId: string;
  title: string;
  titleEng: string | null;
  prodYear: number | null;
  directors: string[];
}

export type KmdbSyncOutcome =
  | { outcome: 'promoted'; specsPromoted: number }
  | { outcome: 'unchanged' }
  | { outcome: 'dry_run'; wouldPromote: number }
  | { outcome: 'error'; reason: string };
