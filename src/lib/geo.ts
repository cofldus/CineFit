// 이동 시간 근사 — 실제 경로 API 미연동 (첫 마일스톤은 대중교통 평균 속도 근사, '추정' 라벨 필수)
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const r = (d: number) => (d * Math.PI) / 180;
  const a =
    Math.sin(r(lat2 - lat1) / 2) ** 2 +
    Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(r(lng2 - lng1) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(a));
}

const TRANSIT_KMH = 22; // 도심 대중교통 평균 근사
const OVERHEAD_MIN = 12; // 환승·대기 오버헤드

export function estimateTravelMinutes(
  origin: { lat: number; lng: number },
  dest: { lat: number; lng: number },
): number {
  return Math.round((haversineKm(origin.lat, origin.lng, dest.lat, dest.lng) / TRANSIT_KMH) * 60 + OVERHEAD_MIN);
}
