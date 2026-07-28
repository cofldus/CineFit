// 상영 종료 회차 자동 비활성화 — 삭제하지 않고 disabled로 전환하며 showtime_changes에 이력이 남는다.
// 사용: npm run maintenance:daily (아래 markStaleData와 함께 실행됨)
import { fileURLToPath } from 'node:url';
import { setShowtimeStatus } from '../../src/data/adminShowtimeService';
import { getAppDbClient } from '../../src/data/client/index';
import { getAppClock } from '../../src/lib/clock';

export interface ExpireShowtimesResult {
  expiredCount: number;
  showtimeIds: number[];
}

export async function expireShowtimes(now: Date = getAppClock().now()): Promise<ExpireShowtimesResult> {
  const rows = await getAppDbClient().query<{ id: number }>(
    `SELECT id FROM showtimes WHERE status = 'active' AND ends_at_est < ?`,
    [now.toISOString()],
  );
  for (const row of rows) {
    await setShowtimeStatus(row.id, 'disabled', { now: () => now, actor: 'maintenance-cli' });
  }
  return { expiredCount: rows.length, showtimeIds: rows.map((r) => r.id) };
}

async function main(): Promise<void> {
  const result = await expireShowtimes();
  console.log(`상영 종료 회차 비활성화: ${result.expiredCount}건`, result.showtimeIds);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
