import { describe, expect, it } from 'vitest';
import { decideLinkage, evaluateCandidate } from '../../src/domain/identifierLinkage/matcher';
import type { CandidateMatchInput, RankedCandidate } from '../../src/domain/identifierLinkage/matcher';

function input(overrides: Partial<CandidateMatchInput> = {}): CandidateMatchInput {
  return {
    movieTitle: '듄: 파트2',
    movieTitleEn: 'Dune: Part Two',
    movieDirector: '드니 빌뇌브',
    movieYear: 2024,
    candidateTitle: '듄: 파트 2',
    candidateTitleEng: 'Dune: Part Two',
    candidateDirectors: ['드니 빌뇌브'],
    candidateYear: 2024,
    ...overrides,
  };
}

describe('후보 평가 — evaluateCandidate', () => {
  it('제목·감독·연도가 모두 일치하면 exact다', () => {
    expect(evaluateCandidate(input()).tier).toBe('exact');
  });

  it('제목·감독은 맞지만 연도가 1년 차이면 high_confidence다', () => {
    expect(evaluateCandidate(input({ candidateYear: 2023 })).tier).toBe('high_confidence');
  });

  it('제목만 맞고 감독 정보가 없으면(판단 불가) high_confidence(연도 일치) 또는 needs_review다', () => {
    const result = evaluateCandidate(input({ movieDirector: null, candidateYear: 2024 }));
    expect(result.signals.directorMatch).toBeNull();
    expect(result.tier).toBe('high_confidence'); // yearDiff=0이므로
  });

  it('감독·연도 둘 다 판단 불가면 needs_review다', () => {
    const result = evaluateCandidate(input({ movieDirector: null, movieYear: null }));
    expect(result.tier).toBe('needs_review');
  });

  it('제목은 맞지만 감독이 다르고 연도도 크게 다르면 conflict다', () => {
    const result = evaluateCandidate(
      input({ candidateDirectors: ['다른감독'], candidateYear: 2019 }),
    );
    expect(result.tier).toBe('conflict');
  });

  it('제목 자체가 다르면 unmatched다', () => {
    expect(evaluateCandidate(input({ candidateTitle: '전혀 다른 영화', candidateTitleEng: null })).tier).toBe(
      'unmatched',
    );
  });

  it('원제 일치만으로도 titleMatch가 성립한다', () => {
    const result = evaluateCandidate(
      input({ movieTitle: '한글 제목만 다름', candidateTitle: '한글 제목도 다름' }),
    );
    expect(result.signals.titleMatch).toBe(true);
  });
});

describe('연결 결정 — decideLinkage', () => {
  const rank = (docId: string, evalInput: Partial<CandidateMatchInput>): RankedCandidate => ({
    docId,
    evaluation: evaluateCandidate(input(evalInput)),
  });

  it('유일한 exact 후보는 자동 연결한다', () => {
    const decision = decideLinkage([rank('K-1', {})]);
    expect(decision).toEqual({ overallTier: 'exact', autoLinkDocId: 'K-1' });
  });

  it('유일한 high_confidence 후보도 자동 연결한다', () => {
    const decision = decideLinkage([rank('K-1', { candidateYear: 2023 })]);
    expect(decision).toEqual({ overallTier: 'high_confidence', autoLinkDocId: 'K-1' });
  });

  it('동점 exact 후보가 여럿이면 자동 연결하지 않고 needs_review로 낮춘다', () => {
    const decision = decideLinkage([rank('K-1', {}), rank('K-2', {})]);
    expect(decision).toEqual({ overallTier: 'needs_review', autoLinkDocId: null });
  });

  it('가장 좋은 등급이 needs_review/conflict/unmatched면 자동 연결하지 않는다', () => {
    expect(decideLinkage([rank('K-1', { movieDirector: null, movieYear: null })])).toEqual({
      overallTier: 'needs_review',
      autoLinkDocId: null,
    });
    expect(
      decideLinkage([rank('K-1', { candidateDirectors: ['다른감독'], candidateYear: 2019 })]),
    ).toEqual({ overallTier: 'conflict', autoLinkDocId: null });
  });

  it('후보가 없으면 unmatched다', () => {
    expect(decideLinkage([])).toEqual({ overallTier: 'unmatched', autoLinkDocId: null });
  });

  it('여러 등급이 섞여 있으면 가장 높은 등급 기준으로 판단한다', () => {
    const decision = decideLinkage([
      rank('K-1', { candidateDirectors: ['다른감독'], candidateYear: 2019 }), // conflict
      rank('K-2', {}), // exact
    ]);
    expect(decision).toEqual({ overallTier: 'exact', autoLinkDocId: 'K-2' });
  });
});
