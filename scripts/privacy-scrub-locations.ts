// R21.1 §4 — 기존 recommendation_runs의 위치 좌표 정리 CLI.
// 사용: npm run privacy:scrub-locations            (보존기간 30일 초과분)
//       npm run privacy:scrub-locations -- --days=0 (전체 즉시 scrub — 기존 데이터 일괄 정리)
import { fileURLToPath } from 'node:url';
import { recommendationRepository } from '../src/data/recommendationRepository';
import { getAppClock } from '../src/lib/clock';
import { LOCATION_RETENTION_DAYS } from '../src/lib/locationPrivacy';

async function main(): Promise<void> {
  const arg = process.argv.find((a) => a.startsWith('--days='));
  const days = arg ? Number(arg.split('=')[1]) : LOCATION_RETENTION_DAYS;
  if (!Number.isFinite(days) || days < 0) throw new Error('--days는 0 이상의 숫자여야 합니다.');
  const changed = await recommendationRepository.scrubOldRunLocations(getAppClock().now(), days);
  console.log(`위치 좌표 scrub 완료 — ${changed}건 (기준: ${days}일 초과, 좌표 삭제 후 grid ID만 유지)`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
