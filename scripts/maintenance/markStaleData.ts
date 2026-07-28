// 오래된 상영관 사양 리포트 — 상태를 바꾸지 않는다(보고 전용). 실제 갱신은 관리자가 확인 후
// 공식 출처를 근거로 admin 화면에서 직접 한다(자동으로 info_status를 낮추지 않는다 — 근거 없는
// 자동 강등은 또 다른 미검증 주장이 되므로).
// 사용: npm run maintenance:stale
import { fileURLToPath } from 'node:url';
import { dataQualityRepository, type AuditoriumQualityRow } from '../../src/data/dataQualityRepository';
import { getAppClock } from '../../src/lib/clock';

export interface StaleDataReport {
  staleCount: number;
  stale: AuditoriumQualityRow[];
}

export async function reportStaleData(now: Date = getAppClock().now()): Promise<StaleDataReport> {
  const rows = await dataQualityRepository.getAuditoriumQuality(now);
  const stale = rows.filter((r) => r.level === 'Stale');
  return { staleCount: stale.length, stale };
}

async function main(): Promise<void> {
  const { staleCount, stale } = await reportStaleData();
  console.log(`오래된(사양 관측 후 180일 초과) 상영관: ${staleCount}건`);
  for (const s of stale) console.log(`- ${s.locationName} ${s.auditoriumNo} (#${s.auditoriumId}, ${s.brand})`);
  if (staleCount > 0) console.log('관리자가 확인 후 /admin/quality에서 참고해 사양을 재검증하세요.');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
