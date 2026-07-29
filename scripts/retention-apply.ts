// 보존 기간 초과 데이터를 실제로 지운다 — 처리 건수는 audit_logs에도 한 건 남는다.
// 사용: npm run retention:apply (먼저 npm run retention:preview로 영향 범위를 확인하세요)
import { fileURLToPath } from 'node:url';
import { retentionService } from '../src/data/retentionService';
import { getAppClock } from '../src/lib/clock';

async function main(): Promise<void> {
  const counts = await retentionService.apply(getAppClock().now(), 'retention-cli');
  console.log('보존 정책 적용 완료:');
  for (const [table, n] of Object.entries(counts)) console.log(`- ${table}: ${n}건 삭제/정리`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
