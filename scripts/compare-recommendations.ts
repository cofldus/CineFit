// 특정 과거 추천 실행을 여러 정책으로 다시 계산해 비교한다 — docs/RECOMMENDATION-EVALUATION.md.
// 사용: npm run compare:recommendations -- --run-id=RUN_ID [--policies=v1,v2]
// A/B 테스트가 아니다 — 실사용자에게 보여주지 않는 관리자 내부 shadow evaluation이다(섹션 17).
import { movieRepository } from '../src/data/movieRepository';
import { recommendationRepository } from '../src/data/recommendationRepository';
import { showtimeRepository } from '../src/data/showtimeRepository';
import { recommend } from '../src/domain/recommendation/engine';
import { POLICY_V1 } from '../src/domain/recommendation/policies/v1';
import { POLICY_V2 } from '../src/domain/recommendation/policies/v2';
import type { RecommendationPolicy } from '../src/domain/recommendation/policies/types';
import { getAppClock } from '../src/lib/clock';

const KNOWN_POLICIES: Record<string, RecommendationPolicy> = { v1: POLICY_V1, v2: POLICY_V2 };

function flag(args: string[], name: string): string | null {
  const found = args.find((a) => a.startsWith(`--${name}=`));
  return found ? found.slice(name.length + 3) : null;
}

async function main() {
  const args = process.argv.slice(2);
  const runIdArg = flag(args, 'run-id');
  if (!runIdArg) {
    console.error('사용법: npm run compare:recommendations -- --run-id=RUN_ID [--policies=v1,v2]');
    process.exit(1);
  }
  const runId = Number(runIdArg);
  const policyVersions = (flag(args, 'policies') ?? 'v1,v2').split(',');

  const run = await recommendationRepository.getRunRequest(runId);
  if (!run) {
    console.error(`추천 실행 #${runId}을 찾을 수 없습니다.`);
    process.exit(1);
  }
  console.log(`추천 실행 #${runId} (${run.createdAt}, 원래 정책: ${run.policyVersion ?? '기록 없음'})`);

  const movie = await movieRepository.findById(run.request.movieId);
  if (!movie) {
    console.error(`영화 id ${run.request.movieId}를 찾을 수 없습니다 — 현재 DB 상태가 실행 당시와 다를 수 있습니다.`);
    process.exit(1);
  }
  // 후보는 현재 DB 기준으로 다시 조회한다 — 정책 비교 목적상 데이터 자체는 고정하고 가중치만 바꾼다.
  const candidates = await showtimeRepository.listCandidates(movie.id, run.request.date);
  const now = getAppClock().now();

  const results = policyVersions.map((version) => {
    const policy = KNOWN_POLICIES[version];
    if (!policy) {
      console.error(`알 수 없는 정책: ${version} (사용 가능: ${Object.keys(KNOWN_POLICIES).join(', ')})`);
      process.exit(1);
    }
    return { version, result: recommend({ movie, candidates, request: run.request, now, weightsOverride: policy.weights[run.request.priority] }) };
  });

  console.log(`\n영화: ${movie.title} · 조건: 우선순위=${run.request.priority}, 이동≤${run.request.maxTravelMinutes}분, 가격≤${run.request.maxPrice}원\n`);

  for (const { version, result } of results) {
    console.log(`--- 정책 ${version} ---`);
    if (result.picks.length === 0) {
      console.log('  (추천 없음)');
      continue;
    }
    for (const p of result.picks) {
      const c = p.scored.candidate;
      console.log(
        `  ${p.label}: ${c.location.name} ${c.auditorium.no} — 종합 ${(p.scored.final * 100).toFixed(0)}% (확신도 ${p.scored.confidenceLabel})`,
      );
    }
  }

  console.log('\n--- 순위 변화 (첫 정책 대비) ---');
  const baseline = results[0];
  for (const { version, result } of results.slice(1)) {
    const changed = result.picks.filter((p, i) => baseline.result.picks[i]?.scored.candidate.auditorium.id !== p.scored.candidate.auditorium.id);
    console.log(`  ${baseline.version} → ${version}: ${changed.length ? `${changed.length}개 순위 변경` : '변경 없음'}`);
  }

  console.log('\n※ 정책 변경 원인은 이 도구가 자동으로 기록하지 않습니다 — 실제로 정책을 바꾸기로');
  console.log('  했다면 docs/RECOMMENDATION-EVALUATION.md의 절차대로 사유를 직접 남기세요.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
