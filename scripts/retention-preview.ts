// 보존 기간 초과 데이터를 실제로 지우지 않고 몇 건이나 지워질지만 보여준다.
// 사용: npm run retention:preview
import { fileURLToPath } from 'node:url';
import { retentionService } from '../src/data/retentionService';
import { getAppClock } from '../src/lib/clock';

async function main(): Promise<void> {
  const counts = await retentionService.preview(getAppClock().now());
  console.log('보존 기간(docs/DATA-RETENTION.md) 초과로 삭제될 행 수 — 미리보기, 아직 지우지 않음:');
  for (const [table, n] of Object.entries(counts)) console.log(`- ${table}: ${n}건`);
  console.log('실제로 지우려면: npm run retention:apply');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
