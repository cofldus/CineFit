// KOBIS 동기화 CLI — Node 24 타입 스트리핑으로 직접 실행
// 사용:
//   npm run sync:kobis -- --date=20260726            # 일별 박스오피스 → 상세 동기화
//   npm run sync:kobis -- --movie-code=20236295      # 특정 영화(쉼표로 복수)
//   npm run sync:kobis -- --date=20260726 --dry-run  # 변경 예측만, 쓰기 없음
// 출력에 API 키·전체 응답 원문을 포함하지 않는다.
import { KobisClient } from '../src/data/adapters/kobis/kobisClient.ts';
import { syncBoxOfficeDate, syncMovieByCode } from '../src/data/adapters/kobis/kobisSyncService.ts';
import type { SyncOutcome } from '../src/data/adapters/kobis/kobisSyncService.ts';
import type { SyncCounts } from '../src/data/adapters/kobis/kobisTypes.ts';

const args = process.argv.slice(2);
const flag = (name: string): string | null => {
  const found = args.find((a) => a.startsWith(`--${name}=`));
  return found ? found.slice(name.length + 3) : null;
};
const dryRun = args.includes('--dry-run');
const date = flag('date');
const movieCodes = flag('movie-code')?.split(',').filter(Boolean) ?? [];

const apiKey = process.env.KOBIS_API_KEY;
if (!apiKey) {
  console.error('KOBIS_API_KEY가 없습니다. 루트 .env에 키를 설정하세요 (.env.example 참고).');
  process.exit(1);
}
if (!date && movieCodes.length === 0) {
  console.error('사용법: npm run sync:kobis -- --date=YYYYMMDD | --movie-code=CODE[,CODE] [--dry-run]');
  process.exit(1);
}

const client = new KobisClient({ apiKey });
const opts = { dryRun, log: (m: string) => console.log(m) };
const counts: SyncCounts = { fetched: 0, created: 0, updated: 0, unchanged: 0, errors: 0, duplicates: 0 };
const add = (o: SyncOutcome) => {
  if (o === 'created') counts.created++;
  else if (o === 'updated') counts.updated++;
  else if (o === 'unchanged') counts.unchanged++;
  else if (o === 'duplicate') counts.duplicates++;
  else counts.errors++;
};

if (date) {
  if (!/^\d{8}$/.test(date)) {
    console.error('--date 형식은 YYYYMMDD 입니다.');
    process.exit(1);
  }
  const c = await syncBoxOfficeDate(client, date, opts);
  counts.fetched += c.fetched;
  counts.created += c.created;
  counts.updated += c.updated;
  counts.unchanged += c.unchanged;
  counts.errors += c.errors;
  counts.duplicates += c.duplicates;
}
for (const code of movieCodes) {
  counts.fetched++;
  add(await syncMovieByCode(client, code, opts));
}

console.log(
  `\n${dryRun ? '[dry-run] ' : ''}동기화 요약 — 조회 ${counts.fetched} / 신규 ${counts.created} / 갱신 ${counts.updated} / 변경없음 ${counts.unchanged} / 중복후보 ${counts.duplicates} / 오류 ${counts.errors}`,
);
process.exit(counts.errors > 0 ? 2 : 0);
