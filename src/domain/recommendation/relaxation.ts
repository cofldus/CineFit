// 결과 0개(R20 §9 zero result) — "어떤 조건을 완화하면 몇 개가 추가되는지"를 실제
// 엔진 재실행으로 계산한다(추정·placeholder 숫자 금지). 후보 목록은 이미 조회된 것을
// 그대로 재사용하므로 DB를 다시 만지지 않는 순수 계산이다.
import { recommend } from './engine';
import type { CandidateShowtime, MovieWithSpecs, RecommendationRequest } from './types';

export interface RelaxationSuggestion {
  key: 'time' | 'travel' | 'price';
  /** "희망 시간대를 전체로 넓히기" 같은 행동 문구 */
  label: string;
  /** 이 조건만 완화했을 때 추가되는 후보 수(실측) */
  added: number;
  /** 현재 결과 URL에 덮어쓸 파라미터 — 값이 빈 문자열이면 그 파라미터를 제거한다 */
  params: Record<string, string>;
}

const TRAVEL_STEPS = [30, 45, 60, 90, 240];

export function suggestRelaxations(input: {
  movie: MovieWithSpecs;
  candidates: CandidateShowtime[];
  request: RecommendationRequest;
  now: Date;
  /** 현재 조건의 후보 수 — 완화 효과(added)의 기준점 */
  baseCount: number;
}): RelaxationSuggestion[] {
  const { movie, candidates, request, now, baseCount } = input;
  const countFor = (patch: Partial<RecommendationRequest>) =>
    recommend({ movie, candidates, request: { ...request, ...patch }, now }).scored.length;

  const out: RelaxationSuggestion[] = [];

  // 1) 시간대 넓히기 — 희망 시작 시간대를 전체로.
  if (request.timeWindow && request.timeWindow !== 'any') {
    const added = countFor({ timeWindow: 'any', timeFrom: undefined, timeTo: undefined }) - baseCount;
    if (added > 0)
      out.push({
        key: 'time',
        label: '희망 시간대를 전체로 넓히기',
        added,
        params: { timeWindow: 'any', timeFrom: '', timeTo: '' },
      });
  }

  // 2) 이동 한도 늘리기 — 실제로 후보가 늘어나는 "가장 가까운" 프리셋 단계를 찾는다
  //    (가장 적은 완화를 제안하기 위해 단계를 순서대로 검사).
  for (const t of TRAVEL_STEPS.filter((t) => t > request.maxTravelMinutes)) {
    const added = countFor({ maxTravelMinutes: t }) - baseCount;
    if (added > 0) {
      out.push({
        key: 'travel',
        label: t >= 240 ? '이동 한도 없이 보기' : `이동 한도를 ${t}분으로 늘리기`,
        added,
        params: { maxTravelMinutes: String(t) },
      });
      break;
    }
  }

  // 3) 가격 기준 완화 — R20부터 추가 지불 의향은 soft(제외 없음)라 새 플로우에선 해당
  //    없음. 구 URL의 절대 상한(maxPrice)이 있을 때만 실제로 후보가 늘어난다.
  if (request.maxPrice < Number.MAX_SAFE_INTEGER / 2) {
    const added = countFor({ maxPrice: Number.MAX_SAFE_INTEGER }) - baseCount;
    if (added > 0)
      out.push({ key: 'price', label: '가격 상한 없이 보기', added, params: { maxPrice: '' } });
  }

  return out.sort((a, b) => b.added - a.added);
}
