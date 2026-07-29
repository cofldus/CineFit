// KOBIS 영화(movies 행) ↔ KMDb 검색 후보 매칭 — 순수 함수, DB·네트워크 의존 없음(테스트 용이).
// 신호: 정규화 제목(원제 포함)·감독·제작연도. 국가·러닝타임은 KMDb 검색 응답 자체에 신뢰할
// 만한 필드가 없어(문서 KMDB-INTEGRATION.md의 "검증된 필드만" 원칙) 신호로 쓰지 않는다.

export const MATCH_TIERS = ['exact', 'high_confidence', 'needs_review', 'conflict', 'unmatched'] as const;
export type MatchTier = (typeof MATCH_TIERS)[number];

export interface MatchSignals {
  titleMatch: boolean;
  directorMatch: boolean | null; // null = 양쪽 중 하나라도 감독 정보가 없어 판단 불가
  yearDiff: number | null; // null = 양쪽 중 하나라도 연도 정보가 없음
}

export interface MatchEvaluation {
  tier: MatchTier;
  signals: MatchSignals;
}

export interface CandidateMatchInput {
  movieTitle: string;
  movieTitleEn: string | null;
  movieDirector: string | null; // movies.director — 콤마로 여러 명 join돼 있음
  movieYear: number | null;
  candidateTitle: string;
  candidateTitleEng: string | null;
  candidateDirectors: string[];
  candidateYear: number | null;
}

const norm = (s: string | null | undefined) => (s ?? '').replace(/[\s:·,\-–—!?.]/g, '').toLowerCase();

export function classifySignals(signals: MatchSignals): MatchTier {
  if (!signals.titleMatch) return 'unmatched';
  if (signals.directorMatch === true && signals.yearDiff === 0) return 'exact';
  if (signals.directorMatch === true || (signals.yearDiff !== null && signals.yearDiff <= 1)) return 'high_confidence';
  if (signals.directorMatch === false && (signals.yearDiff === null || signals.yearDiff > 1)) return 'conflict';
  return 'needs_review';
}

export function evaluateCandidate(input: CandidateMatchInput): MatchEvaluation {
  const titleMatch =
    norm(input.movieTitle) === norm(input.candidateTitle) ||
    (!!input.movieTitleEn && norm(input.movieTitleEn) === norm(input.candidateTitleEng));

  let directorMatch: boolean | null = null;
  if (input.movieDirector?.trim() && input.candidateDirectors.length) {
    const movieDirectors = input.movieDirector.split(',').map((d) => norm(d));
    directorMatch = input.candidateDirectors.some((d) => movieDirectors.includes(norm(d)));
  }

  let yearDiff: number | null = null;
  if (input.movieYear && input.candidateYear) yearDiff = Math.abs(input.movieYear - input.candidateYear);

  const signals: MatchSignals = { titleMatch, directorMatch, yearDiff };
  return { tier: classifySignals(signals), signals };
}

const TIER_RANK: Record<MatchTier, number> = { exact: 4, high_confidence: 3, needs_review: 2, conflict: 1, unmatched: 0 };

export interface RankedCandidate {
  docId: string;
  evaluation: MatchEvaluation;
}

export interface LinkageDecision {
  overallTier: MatchTier;
  autoLinkDocId: string | null; // null이면 관리자 검토 필요
}

/** 한 영화에 대한 여러 KMDb 후보를 보고 자동 연결 여부를 결정한다. exact/high_confidence
 * 등급에서 유일한 후보일 때만 자동 연결한다 — 동점 후보가 있으면 자동 연결하지 않고
 * needs_review로 낮춰 사람이 고르게 한다. */
export function decideLinkage(candidates: RankedCandidate[]): LinkageDecision {
  if (!candidates.length) return { overallTier: 'unmatched', autoLinkDocId: null };

  const best = candidates.reduce((a, b) => (TIER_RANK[b.evaluation.tier] > TIER_RANK[a.evaluation.tier] ? b : a));
  const bestTierCandidates = candidates.filter((c) => c.evaluation.tier === best.evaluation.tier);
  const isAutoLinkableTier = best.evaluation.tier === 'exact' || best.evaluation.tier === 'high_confidence';

  if (isAutoLinkableTier && bestTierCandidates.length === 1) {
    return { overallTier: best.evaluation.tier, autoLinkDocId: best.docId };
  }
  if (isAutoLinkableTier && bestTierCandidates.length > 1) {
    return { overallTier: 'needs_review', autoLinkDocId: null }; // 동점 — 자동 연결 보류
  }
  return { overallTier: best.evaluation.tier, autoLinkDocId: null };
}
