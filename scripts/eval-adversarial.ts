// 적대적(변형) 추천 평가 CLI — docs/HOLDOUT-EVALUATION.md 참고.
// 골든셋처럼 고정된 정답을 맞히는 게 아니라, "기본 요청"과 "살짝 바꾼 요청"의 결과를 비교해
// 논리적으로 당연히 성립해야 하는 불변식(invariant)이 실제로 지켜지는지 확인한다.
// 사용:
//   npm run eval:adversarial
//   npm run eval:adversarial -- --dataset=v1 --policy=v1
// 사전 조건: npm run db:seed
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { movieRepository } from '../src/data/movieRepository';
import { showtimeRepository } from '../src/data/showtimeRepository';
import { recommend } from '../src/domain/recommendation/engine';
import { ACTIVE_POLICY } from '../src/domain/recommendation/policies/activePolicy';
import { POLICY_V1 } from '../src/domain/recommendation/policies/v1';
import { POLICY_V2 } from '../src/domain/recommendation/policies/v2';
import type { RecommendationPolicy } from '../src/domain/recommendation/policies/types';
import type { ScoredCandidate } from '../src/domain/recommendation/types';
import { getAppClock } from '../src/lib/clock';
import { toDomainRequest, type GoldenScenario } from './eval-recommendations.ts';

const KNOWN_POLICIES: Record<string, RecommendationPolicy> = { v1: POLICY_V1, v2: POLICY_V2 };

type BaseRequest = GoldenScenario['request'];

export interface AdversarialCase {
  id: string;
  description: string;
  baseRequest: BaseRequest;
  transform: Partial<BaseRequest>;
  invariant: string; // 'subset_or_equal' | 'unchanged_candidate_set' | 'expect_empty_after' | 'format_removed:<format>'
}

export interface AdversarialOutcome {
  id: string;
  description: string;
  pass: boolean;
  reason: string | null;
  baseCount: number;
  transformedCount: number;
}

export interface AdversarialReport {
  policyVersion: string;
  datasetVersion: string;
  caseCount: number;
  passCount: number;
  outcomes: AdversarialOutcome[];
}

function auditoriumIds(scored: ScoredCandidate[]): Set<number> {
  return new Set(scored.map((s) => s.candidate.auditorium.id));
}

function hasFormat(scored: ScoredCandidate[], format: string): boolean {
  return scored.some((s) => s.candidate.format === format);
}

async function runOne(request: BaseRequest, policy: RecommendationPolicy): Promise<ScoredCandidate[]> {
  const domainRequest = await toDomainRequest(request);
  const movie = await movieRepository.findById(request.movieId);
  if (!movie) return [];
  const candidates = await showtimeRepository.listCandidates(movie.id, domainRequest.date);
  const result = recommend({
    movie,
    candidates,
    request: domainRequest,
    now: getAppClock().now(),
    weightsOverride: policy.weights[domainRequest.priority],
  });
  return result.scored;
}

function checkInvariant(
  invariant: string,
  base: ScoredCandidate[],
  transformed: ScoredCandidate[],
): { pass: boolean; reason: string | null } {
  const baseIds = auditoriumIds(base);
  const transformedIds = auditoriumIds(transformed);

  if (invariant === 'subset_or_equal') {
    const extra = [...transformedIds].filter((id) => !baseIds.has(id));
    return extra.length === 0
      ? { pass: true, reason: null }
      : { pass: false, reason: `조건을 좁혔는데 새로 나타난 상영관: ${extra.join(',')}` };
  }
  if (invariant === 'unchanged_candidate_set') {
    const sameSize = baseIds.size === transformedIds.size;
    const sameMembers = [...baseIds].every((id) => transformedIds.has(id));
    return sameSize && sameMembers
      ? { pass: true, reason: null }
      : { pass: false, reason: `소프트 조건 변경인데 통과 후보 집합이 달라짐(전: ${[...baseIds].join(',')} / 후: ${[...transformedIds].join(',')})` };
  }
  if (invariant === 'expect_empty_after') {
    return transformed.length === 0
      ? { pass: true, reason: null }
      : { pass: false, reason: `결과가 비어야 하는데 ${transformed.length}건 남음` };
  }
  if (invariant.startsWith('format_removed:')) {
    const format = invariant.slice('format_removed:'.length);
    return !hasFormat(transformed, format)
      ? { pass: true, reason: null }
      : { pass: false, reason: `제외돼야 할 포맷(${format})이 여전히 남아있음` };
  }
  return { pass: false, reason: `알 수 없는 불변식: ${invariant}` };
}

export async function evaluateAdversarial(
  dataset: { version: string; cases: AdversarialCase[] },
  policy: RecommendationPolicy,
): Promise<AdversarialReport> {
  const outcomes: AdversarialOutcome[] = [];
  for (const c of dataset.cases) {
    const base = await runOne(c.baseRequest, policy);
    const transformed = await runOne({ ...c.baseRequest, ...c.transform }, policy);
    const { pass, reason } = checkInvariant(c.invariant, base, transformed);
    outcomes.push({ id: c.id, description: c.description, pass, reason, baseCount: base.length, transformedCount: transformed.length });
  }
  return {
    policyVersion: policy.version,
    datasetVersion: dataset.version,
    caseCount: outcomes.length,
    passCount: outcomes.filter((o) => o.pass).length,
    outcomes,
  };
}

function printReport(report: AdversarialReport): void {
  console.log(`\n=== 적대적 평가 — 정책 ${report.policyVersion} × 데이터셋 ${report.datasetVersion} ===`);
  console.log(`케이스: ${report.caseCount}건, 통과: ${report.passCount}/${report.caseCount}`);
  const failing = report.outcomes.filter((o) => !o.pass);
  if (failing.length > 0) {
    console.log(`\n실패한 케이스 ${failing.length}건:`);
    for (const f of failing) console.log(`  - [${f.id}] ${f.description}\n      · ${f.reason}`);
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const flag = (name: string): string | null => {
    const found = args.find((a) => a.startsWith(`--${name}=`));
    return found ? found.slice(name.length + 3) : null;
  };
  const datasetName = flag('dataset') ?? 'v1';
  const policyName = flag('policy');
  const policy = policyName ? KNOWN_POLICIES[policyName] : ACTIVE_POLICY;
  if (!policy) {
    console.error(`알 수 없는 정책 버전: ${policyName} (사용 가능: ${Object.keys(KNOWN_POLICIES).join(', ')})`);
    process.exit(1);
  }

  const datasetPath = join(process.cwd(), 'eval', 'adversarial', `${datasetName}.json`);
  if (!existsSync(datasetPath)) {
    console.error(`적대적 평가 데이터셋을 찾을 수 없습니다: ${datasetPath}`);
    process.exit(1);
  }
  const dataset = JSON.parse(readFileSync(datasetPath, 'utf8')) as { version: string; cases: AdversarialCase[] };
  const report = await evaluateAdversarial(dataset, policy);
  printReport(report);
  process.exit(report.passCount === report.caseCount ? 0 : 1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
