// R21.1 §4 — 위치정보 최소화. recommendation_runs.request에는 정확한 주소·정밀 좌표를
// 저장하지 않는다: 좌표는 소수 3자리(약 110m)로 축약, 라벨은 화이트리스트 밖이면 일반화.
// 보존기간(LOCATION_RETENTION_DAYS)이 지나면 좌표를 삭제하고 집계용 grid ID만 남긴다.
import { ORIGIN_PRESETS } from '../data/constants';

/** 저장된 좌표의 보존기간(일) — 지나면 scrub(좌표 삭제, grid만 유지). */
export const LOCATION_RETENTION_DAYS = 30;

const ALLOWED_LABELS = new Set<string>([
  ...ORIGIN_PRESETS.map((o) => o.label),
  '현재 위치',
  '재현 위치',
  '사용자 지정 위치',
  '위치 정보 삭제됨',
]);

/** 재현에 필요한 최소 정밀도(소수 3자리 ≈ 110m)로 좌표 축약 + 라벨 일반화. */
export function sanitizeOriginForStorage(origin: {
  lat: number;
  lng: number;
  label?: string;
}): { lat: number; lng: number; label?: string } {
  return {
    lat: Number(origin.lat.toFixed(3)),
    lng: Number(origin.lng.toFixed(3)),
    label: origin.label && ALLOWED_LABELS.has(origin.label) ? origin.label : '사용자 지정 위치',
  };
}

/** 집계 전용 grid ID (소수 2자리 격자 ≈ 1.1km) — scrub 후에도 대략의 지역 분포는 남는다. */
export function coarseGridId(lat: number, lng: number): string {
  return `g${lat.toFixed(2)},${lng.toFixed(2)}`;
}

/** scrub된 origin 형태 — 좌표 없음, grid + 라벨만. */
export interface ScrubbedOrigin {
  label?: string;
  gridId: string;
  scrubbed: true;
}
