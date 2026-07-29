// 추천 엔진 오프라인 평가 CLI — docs/RECOMMENDATION-EVALUATION.md 참고.
// 사용:
//   npm run eval:recommendations                    # ACTIVE_POLICY로 golden-v1 평가
//   npm run eval:recommendations -- --dataset=v1    # 데이터셋 지정
//   npm run eval:recommendations -- --compare=v1,v2 # 여러 정책 나란히 비교(정책이 실제 있을 때)
// 사전 조건: npm run db:seed (골든셋이 참조하는 시드 영화·회차가 있어야 한다)
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ORIGIN_PRESETS } from '../src/data/constants';
import { movieRepository } from '../src/data/movieRepository';
import { showtimeRepository } from '../src/data/showtimeRepository';
import { recommend } from '../src/domain/recommendation/engine';
import { ACTIVE_POLICY } from '../src/domain/recommendation/policies/activePolicy';
import { POLICY_V1 } from '../src/domain/recommendation/policies/v1';
import { POLICY_V2 } from '../src/domain/recommendation/policies/v2';
import type { RecommendationPolicy } from '../src/domain/recommendation/policies/types';
import type { RecommendationRequest } from '../src/domain/recommendation/types';
import { getAppClock } from '../src/lib/clock';

export interface GoldenScenario {
  id: string;
  description: string;
  request: {
    movieId: number;
    originId: string;
    date: string;
    maxTravelMinutes: number;
    maxPrice: number;
    priority: 'balance' | 'quality' | 'logistics';
    allowImax: boolean;
    allowDolby: boolean;
    allowStandard: boolean;
    motionSickness: 0 | 1 | 2;
    subtitleReadability: boolean;
    neckComfort: boolean;
    wheelchair: boolean;
  };
  expectEmpty: boolean;
  expectedTop1AuditoriumId: number | null;
  acceptableTop3AuditoriumIds: number[] | null;
  mustExcludeAuditoriumIds: number[];
  reasoning: string;
}

const KNOWN_POLICIES: Record<string, RecommendationPolicy> = { v1: POLICY_V1, v2: POLICY_V2 };

function flag(args: string[], name: string): string | null {
  const found = args.find((a) => a.startsWith(`--${name}=`));
  return found ? found.slice(name.length + 3) : null;
}

export async function toDomainRequest(req: GoldenScenario['request']): Promise<RecommendationRequest> {
  const origin = ORIGIN_PRESETS.find((o) => o.id === req.originId) ?? ORIGIN_PRESETS[0];
  return {
    movieId: req.movieId,
    origin: { lat: origin.lat, lng: origin.lng, label: origin.label },
    date: req.date,
    maxTravelMinutes: req.maxTravelMinutes,
    maxPrice: req.maxPrice,
    priority: req.priority,
    allowImax: req.allowImax,
    allowDolby: req.allowDolby,
    allowStandard: req.allowStandard,
    motionSickness: req.motionSickness,
    subtitleReadability: req.subtitleReadability,
    neckComfort: req.neckComfort,
    wheelchair: req.wheelchair,
  };
}

interface ScenarioOutcome {
  id: string;
  description: string;
  pass: boolean;
  failures: string[];
  latencyMs: number;
  topConfidence: '높음' | '보통' | '낮음' | null;
  pickCount: number;
  ndcg3: number | null;
}

/** 이진 관련성 NDCG@3 — "허용 Top3"나 "예상 Top1"이 있는 시나리오에서만 의미가 있다. */
function ndcgAt3(pickedAuditoriumIds: number[], relevantSet: Set<number>): number {
  if (relevantSet.size === 0) return 1; // 판단 기준이 없으면 평가 대상 아님(호출부에서 걸러냄)
  const dcg = pickedAuditoriumIds
    .slice(0, 3)
    .reduce((sum, id, i) => sum + (relevantSet.has(id) ? 1 / Math.log2(i + 2) : 0), 0);
  const idealHits = Math.min(3, relevantSet.size);
  const idcg = Array.from({ length: idealHits }, (_, i) => 1 / Math.log2(i + 2)).reduce((a, b) => a + b, 0);
  return idcg === 0 ? 1 : dcg / idcg;
}

const OVERCLAIM_TERMS = ['공식 확정', '확실히 공식', '무조건 공식'];

async function evaluateScenario(scenario: GoldenScenario, policy: RecommendationPolicy): Promise<ScenarioOutcome> {
  const failures: string[] = [];
  const request = await toDomainRequest(scenario.request);
  const movie = await movieRepository.findById(scenario.request.movieId);
  if (!movie) {
    return {
      id: scenario.id,
      description: scenario.description,
      pass: false,
      failures: [`영화 id ${scenario.request.movieId}를 찾을 수 없음 — db:seed를 먼저 실행했는지 확인`],
      latencyMs: 0,
      topConfidence: null,
      pickCount: 0,
      ndcg3: null,
    };
  }
  const candidates = await showtimeRepository.listCandidates(movie.id, request.date);

  const started = performance.now();
  const result = recommend({ movie, candidates, request, now: getAppClock().now(), weightsOverride: policy.weights[request.priority] });
  const latencyMs = performance.now() - started;

  const pickedAuditoriumIds = result.picks.map((p) => p.scored.candidate.auditorium.id);
  const scoredAuditoriumIds = new Set(result.scored.map((s) => s.candidate.auditorium.id));

  if (scenario.expectEmpty !== (result.picks.length === 0)) {
    failures.push(`빈 결과 기대=${scenario.expectEmpty}, 실제 picks=${result.picks.length}`);
  }
  for (const mustExclude of scenario.mustExcludeAuditoriumIds) {
    if (scoredAuditoriumIds.has(mustExclude)) {
      failures.push(`상영관 ${mustExclude}가 제외되어야 하는데 통과 후보에 포함됨(하드 필터 위반)`);
    }
  }
  if (scenario.expectedTop1AuditoriumId !== null) {
    const actualTop1 = pickedAuditoriumIds[0] ?? null;
    if (actualTop1 !== scenario.expectedTop1AuditoriumId) {
      failures.push(`Top1 기대=${scenario.expectedTop1AuditoriumId}, 실제=${actualTop1}`);
    }
  }
  if (scenario.acceptableTop3AuditoriumIds !== null) {
    const allowed = new Set(scenario.acceptableTop3AuditoriumIds);
    const outOfBand = pickedAuditoriumIds.filter((id) => !allowed.has(id));
    if (outOfBand.length > 0) failures.push(`허용 Top3(${[...allowed].join(',')}) 밖의 상영관 포함: ${outOfBand.join(',')}`);
  }

  let ndcg3: number | null = null;
  const relevant = new Set<number>(scenario.expectedTop1AuditoriumId !== null ? [scenario.expectedTop1AuditoriumId] : scenario.acceptableTop3AuditoriumIds ?? []);
  if (relevant.size > 0) ndcg3 = ndcgAt3(pickedAuditoriumIds, relevant);

  return {
    id: scenario.id,
    description: scenario.description,
    pass: failures.length === 0,
    failures,
    latencyMs,
    topConfidence: result.picks[0]?.scored.confidenceLabel ?? null,
    pickCount: result.picks.length,
    ndcg3,
  };
}

export interface AggregateReport {
  policyVersion: string;
  datasetVersion: string;
  scenarioCount: number;
  passCount: number;
  top1MatchRate: number | null;
  top3InclusionRate: number | null;
  hardExclusionViolations: number;
  avgNdcg3: number | null;
  avgConfidenceScore: number | null;
  lowConfidenceRate: number;
  emptyRate: number;
  explanationMissingRate: number;
  overclaimCount: number;
  avgLatencyMs: number;
  outcomes: ScenarioOutcome[];
}

export async function evaluateDataset(dataset: { version: string; scenarios: GoldenScenario[] }, policy: RecommendationPolicy): Promise<AggregateReport> {
  const outcomes: ScenarioOutcome[] = [];
  let hardExclusionViolations = 0;
  let explanationMissing = 0;
  let overclaimCount = 0;
  let totalScored = 0;

  for (const scenario of dataset.scenarios) {
    const outcome = await evaluateScenario(scenario, policy);
    outcomes.push(outcome);
    hardExclusionViolations += outcome.failures.filter((f) => f.includes('하드 필터 위반')).length;

    // 설명 필수 요소·과장 표현 점검은 실제 scored 후보를 다시 조회해 확인한다
    const request = await toDomainRequest(scenario.request);
    const movie = await movieRepository.findById(scenario.request.movieId);
    if (movie) {
      const candidates = await showtimeRepository.listCandidates(movie.id, request.date);
      const result = recommend({ movie, candidates, request, now: getAppClock().now(), weightsOverride: policy.weights[request.priority] });
      for (const s of result.scored) {
        totalScored += 1;
        if (s.pros.length === 0 && s.cons.length === 0 && s.uncertainties.length === 0) explanationMissing += 1;
        if (s.citations.length === 0) explanationMissing += 1;
        const allText = [...s.pros, ...s.cons, ...s.uncertainties].join(' ');
        const hasOverclaim = OVERCLAIM_TERMS.some((term) => allText.includes(term));
        const hasOfficialCitation = s.citations.some((c) => c.infoStatus === 'official' || c.infoStatus === 'multi_source');
        if (hasOverclaim && !hasOfficialCitation) overclaimCount += 1;
      }
    }
  }

  const withTop1 = outcomes.filter((_, i) => dataset.scenarios[i].expectedTop1AuditoriumId !== null);
  const withTop3 = outcomes.filter((_, i) => dataset.scenarios[i].acceptableTop3AuditoriumIds !== null);
  const top1Matches = withTop1.filter((o) => !o.failures.some((f) => f.startsWith('Top1'))).length;
  const top3Matches = withTop3.filter((o) => !o.failures.some((f) => f.startsWith('허용 Top3'))).length;
  const ndcgValues = outcomes.map((o) => o.ndcg3).filter((v): v is number => v !== null);
  const confidenceScores = outcomes
    .map((o): number | null => (o.topConfidence === '높음' ? 1 : o.topConfidence === '보통' ? 0.5 : o.topConfidence === '낮음' ? 0 : null))
    .filter((v): v is number => v !== null);

  return {
    policyVersion: policy.version,
    datasetVersion: dataset.version,
    scenarioCount: outcomes.length,
    passCount: outcomes.filter((o) => o.pass).length,
    top1MatchRate: withTop1.length ? top1Matches / withTop1.length : null,
    top3InclusionRate: withTop3.length ? top3Matches / withTop3.length : null,
    hardExclusionViolations,
    avgNdcg3: ndcgValues.length ? ndcgValues.reduce((a, b) => a + b, 0) / ndcgValues.length : null,
    avgConfidenceScore: confidenceScores.length ? confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length : null,
    lowConfidenceRate: outcomes.filter((o) => o.topConfidence === '낮음').length / outcomes.length,
    emptyRate: outcomes.filter((o) => o.pickCount === 0).length / outcomes.length,
    explanationMissingRate: totalScored ? explanationMissing / totalScored : 0,
    overclaimCount,
    avgLatencyMs: outcomes.reduce((a, o) => a + o.latencyMs, 0) / outcomes.length,
    outcomes,
  };
}

function printReport(report: AggregateReport) {
  const pct = (v: number | null) => (v === null ? 'N/A' : `${(v * 100).toFixed(1)}%`);
  console.log(`\n=== 정책 ${report.policyVersion} × 데이터셋 ${report.datasetVersion} ===`);
  console.log(`시나리오: ${report.scenarioCount}건, 전체 통과: ${report.passCount}/${report.scenarioCount}`);
  console.log(`Top1 일치율: ${pct(report.top1MatchRate)}`);
  console.log(`Top3 포함률: ${pct(report.top3InclusionRate)}`);
  console.log(`필수 제외 위반: ${report.hardExclusionViolations}건`);
  console.log(`평균 NDCG@3: ${report.avgNdcg3?.toFixed(3) ?? 'N/A'}`);
  console.log(`평균 확신도 점수(높음1/보통0.5/낮음0): ${report.avgConfidenceScore?.toFixed(2) ?? 'N/A'}`);
  console.log(`저신뢰 추천 비율: ${pct(report.lowConfidenceRate)}`);
  console.log(`추천 없음 비율: ${pct(report.emptyRate)}`);
  console.log(`설명 필수 요소 누락률: ${pct(report.explanationMissingRate)}`);
  console.log(`잘못된 공식 확정 표현: ${report.overclaimCount}건`);
  console.log(`평균 실행 시간: ${report.avgLatencyMs.toFixed(2)}ms`);

  const failing = report.outcomes.filter((o) => !o.pass);
  if (failing.length > 0) {
    console.log(`\n실패한 시나리오 ${failing.length}건:`);
    for (const f of failing) {
      console.log(`  - [${f.id}] ${f.description}`);
      for (const reason of f.failures) console.log(`      · ${reason}`);
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const datasetName = flag(args, 'dataset') ?? 'v1';
  const compareArg = flag(args, 'compare');
  const policyVersions = compareArg ? compareArg.split(',') : [ACTIVE_POLICY.version];

  const datasetPath = join(process.cwd(), 'eval', 'golden', `${datasetName}.json`);
  if (!existsSync(datasetPath)) {
    console.error(`골든 데이터셋을 찾을 수 없습니다: ${datasetPath}`);
    process.exit(1);
  }
  const dataset = JSON.parse(readFileSync(datasetPath, 'utf8')) as { version: string; scenarios: GoldenScenario[] };

  const reports: AggregateReport[] = [];
  for (const version of policyVersions) {
    const policy = KNOWN_POLICIES[version];
    if (!policy) {
      console.error(`알 수 없는 정책 버전: ${version} (사용 가능: ${Object.keys(KNOWN_POLICIES).join(', ')})`);
      process.exit(1);
    }
    const report = await evaluateDataset(dataset, policy);
    printReport(report);
    reports.push(report);
  }

  const outDir = join(process.cwd(), 'eval', 'reports');
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, `latest-${policyVersions.join('-vs-')}.json`);
  writeFileSync(outPath, JSON.stringify(reports, null, 2) + '\n');
  console.log(`\n리포트 저장: ${outPath}`);
}

// CLI로 직접 실행될 때만 main()을 돌린다 — 테스트가 evaluateDataset을 import할 때는 실행되지 않는다.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
