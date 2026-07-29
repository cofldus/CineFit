// KOBIS↔KMDb 식별자 연결 CLI — Node 24 타입 스트리핑으로 직접 실행
// 사용:
//   npm run sync:movie-identifiers                  # 미연결 영화 전체 대상
//   npm run sync:movie-identifiers -- --dry-run     # 변경 예측만, 쓰기 없음
//   npm run sync:movie-identifiers -- --review-only # 등급이 높아도 자동 연결하지 않고 전부 검토 대기로
//   npm run sync:movie-identifiers -- --movie-id=5,7
// 자동 연결은 exact/high_confidence 등급에서 후보가 유일할 때만 일어난다. 나머지는
// /admin/data-linkage에서 사람이 검토한다(문서 IDENTIFIER-LINKAGE.md).
import { KmdbClient } from '../src/data/adapters/kmdb/kmdbClient.ts';
import { getAppDbClient } from '../src/data/client/index.ts';
import { linkMovie } from '../src/data/identifierLinkageService.ts';

const args = process.argv.slice(2);
const flag = (name: string): string | null => {
  const found = args.find((a) => a.startsWith(`--${name}=`));
  return found ? found.slice(name.length + 3) : null;
};
const dryRun = args.includes('--dry-run');
const reviewOnly = args.includes('--review-only');
const movieIdArg = flag('movie-id')?.split(',').filter(Boolean).map(Number);

const apiKey = process.env.KMDB_API_KEY;
if (!apiKey) {
  console.error('KMDB_API_KEY가 없습니다. 루트 .env에 키를 설정하세요 (.env.example 참고).');
  process.exit(1);
}

const db = getAppDbClient();
const movieIds =
  movieIdArg ??
  (await db.query<{ id: number }>(`SELECT id FROM movies WHERE kmdb_docid IS NULL ORDER BY id`)).map((r) => r.id);

if (movieIds.length === 0) {
  console.log('연결할 대상이 없습니다(모든 영화가 이미 KMDb와 연결됨).');
  process.exit(0);
}

const client = new KmdbClient({ apiKey });
const opts = { dryRun, reviewOnly, log: (m: string) => console.log(m) };

let autoLinked = 0;
let needsReview = 0;
let errors = 0;

for (const movieId of movieIds) {
  const result = await linkMovie(client, movieId, opts);
  if (!result.ok) {
    errors++;
    console.error(`! movie #${movieId}: ${result.error}`);
    continue;
  }
  if (result.autoLinked) autoLinked++;
  else needsReview++;
}

console.log(
  `\n${dryRun ? '[dry-run] ' : ''}식별자 연결 요약 — 대상 ${movieIds.length} / 자동 연결 ${autoLinked} / 검토 필요 ${needsReview} / 오류 ${errors}`,
);
process.exit(errors > 0 ? 2 : 0);
