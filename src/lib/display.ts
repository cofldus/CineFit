import { VERIFIED_STATUSES } from '../domain/recommendation/presets';
import type {
  Citation,
  MovieSpecKey,
  MovieWithSpecs,
  RecommendationRequest,
  ScoredCandidate,
  SpecValue,
} from '../domain/recommendation/types';

export const pct = (x: number) => `${Math.round(Math.min(1, Math.max(0, x)) * 100)}%`;

// 종합 점수(0~1) 자체는 그대로 보여주되, 옆에 해석 문구를 함께 표시해 "58%가 좋은 건지
// 나쁜 건지" 바로 판단할 수 있게 한다 — 점수 계산 로직(src/domain/recommendation/engine.ts)은
// 건드리지 않고, 이미 나온 숫자를 사람이 읽는 말로 옮기기만 한다.
export function scoreInterpretation(final: number): string {
  if (final >= 0.8) return '핵심 조건을 대부분 충족';
  if (final >= 0.6) return '조건에 잘 맞음';
  if (final >= 0.4) return '적합도 보통';
  return '일부 조건만 충족';
}

// 카드 하나에 개별 출처 배지를 여러 번 반복하는 대신, 요약 상태 하나만 기본 노출하기 위한
// 헬퍼 — 상세 출처 목록은 그대로 details 패널에 남긴다.
export function citationsTrustSummary(citations: Citation[]): string {
  if (citations.length === 0) return '확인 중';
  const verified = citations.filter((c) => VERIFIED_STATUSES.has(c.infoStatus)).length;
  return verified === citations.length ? '확인됨' : '일부 추정';
}

// "적합도 58%"처럼 근거 없어 보이는 숫자 대신, 실제 계산된 축 값·사용자가 입력한 조건을
// 그대로 검사해 "핵심 조건 5개 중 N개 충족"을 만든다 — 숫자를 새로 지어내지 않고, 이미
// CompareTable의 5개 핵심 축(포맷·이동·가격·상영관 품질·정보 신뢰도)과 같은 기준으로
// 통과 여부만 판정한다. 이동·가격은 애초에 하드 필터를 통과한 후보만 여기 오므로 항상
// 충족이지만, 그 자체로도 실제 사실이다(허수가 아니다).
export function coreConditionsSummary(scored: ScoredCandidate, request: RecommendationRequest): string {
  const checks = [
    scored.axes.ffm >= 0.6,
    scored.travelMinutes <= request.maxTravelMinutes,
    scored.candidate.priceAdult <= request.maxPrice,
    scored.axes.audQ >= 0.6,
    scored.axes.dc >= 0.5,
  ];
  const met = checks.filter(Boolean).length;
  return `핵심 조건 ${checks.length}개 중 ${met}개 충족`;
}

type ReasonCategory = 'screen' | 'auditorium' | 'seat' | 'travel';

export const REASON_CATEGORY_LABEL: Record<ReasonCategory, string> = {
  screen: '화면',
  auditorium: '상영관',
  seat: '좌석',
  travel: '이동',
};

// 추천 이유 문장을 의미별로 묶어 보여주기 위한 분류 — 실제 문장 내용(화면비/설비/좌석/이동)에
// 기반한 키워드 매칭이며, 새 사실을 지어내지 않고 이미 있는 문장에 라벨만 붙인다. 매칭되지
// 않으면 "상영관"(설비 일반)으로 분류한다.
export function categorizeReason(reason: string): ReasonCategory {
  if (/화면비|확장비|AR\b|스크린 비율/.test(reason)) return 'screen';
  if (/좌석|구역/.test(reason)) return 'seat';
  if (/이동|거리/.test(reason)) return 'travel';
  return 'auditorium';
}

export const SPEC_KEY_LABELS: Record<MovieSpecKey, string> = {
  native_ar: '기본 화면비',
  imax_expanded_ar: 'IMAX 확장 화면비',
  filmed_for_imax: 'IMAX 인증 카메라',
  film_format: '촬영 포맷',
  atmos_mix: '돌비 애트모스 믹스',
  imax_sound_mix: 'IMAX 사운드 믹스',
  dolby_vision: '돌비 비전 마스터',
  dark_scene_ratio: '어두운 장면 비중',
  genre_spectacle: '시각 스펙터클 장르',
  format_versions: '배급 포맷 버전',
};

export function formatSpecValue(key: MovieSpecKey, spec: SpecValue): string {
  const v = spec.value;
  if (key === 'native_ar' || key === 'imax_expanded_ar') return `${v}:1`;
  if (key === 'dark_scene_ratio') return `${Math.round(Number(v) * 100)}%`;
  if (key === 'format_versions' && Array.isArray(v)) return v.join(' · ');
  if (typeof v === 'boolean') return v ? '있음' : '없음';
  return String(v);
}

// 영화 카드에 노출할 대표 사양 (있는 것만)
export function keySpecEntries(movie: MovieWithSpecs): { key: MovieSpecKey; spec: SpecValue }[] {
  const keys: MovieSpecKey[] = ['native_ar', 'imax_expanded_ar', 'film_format', 'atmos_mix', 'format_versions'];
  return keys.flatMap((key) => {
    const spec = movie.specs[key];
    return spec ? [{ key, spec }] : [];
  });
}

// 좌석 존 목적 라벨 — 상영관 상세 페이지와 좌석 맵 일러스트 양쪽에서 같은 라벨을 쓴다.
export const SEAT_PURPOSE_LABELS: Record<string, string> = {
  immersive: '몰입',
  overview: '전체 시야',
  subtitle: '자막 가독',
  sound: '사운드',
  low_motion: '모션 순함',
  neck_easy: '목 편함',
  exit_easy: '출입 편함',
  pair: '둘이 보기',
  wheelchair: '휠체어',
};
