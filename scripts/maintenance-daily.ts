// 일일 유지보수 — DB만 다루는 저비용 작업만 묶는다(네트워크 요청은 별도 npm run maintenance:links로).
// 사용: npm run maintenance:daily
// app/api/admin/cron/maintenance-daily/route.ts(Vercel Cron)도 이 함수를 그대로 재사용한다.
import { fileURLToPath } from 'node:url';
import { expireShowtimes, type ExpireShowtimesResult } from './maintenance/expireShowtimes';
import { reportStaleData, type StaleDataReport } from './maintenance/markStaleData';

export interface DailyMaintenanceResult {
  expired: ExpireShowtimesResult;
  stale: StaleDataReport;
}

export async function runDailyMaintenance(): Promise<DailyMaintenanceResult> {
  const expired = await expireShowtimes();
  const stale = await reportStaleData();
  return { expired, stale };
}

async function main(): Promise<void> {
  const { expired, stale } = await runDailyMaintenance();
  console.log(`상영 종료 회차 비활성화: ${expired.expiredCount}건`, expired.showtimeIds);
  console.log(`오래된(사양 관측 후 180일 초과) 상영관: ${stale.staleCount}건`);
  for (const s of stale.stale) console.log(`- ${s.locationName} ${s.auditoriumNo} (#${s.auditoriumId}, ${s.brand})`);
  console.log('예매 링크 검증은 네트워크 요청이 필요해 별도로 npm run maintenance:links를 실행하세요.');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
