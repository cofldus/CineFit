// KMDb 동기화 CLI — Node 24 타입 스트리핑으로 직접 실행
// 사용:
//   npm run sync:kmdb -- --movie-id=5            # 이미 KMDb 식별자가 연결된 영화 하나
//   npm run sync:kmdb -- --movie-id=5,7,12       # 여러 영화(쉼표로 복수)
//   npm run sync:kmdb -- --movie-id=5 --dry-run  # 변경 예측만, 쓰기 없음
// 식별자 연결(어느 KMDb DOCID인지 결정) 자체는 이 CLI가 하지 않는다 — 먼저
// npm run sync:movie-identifiers로 movies.kmdb_docid를 채워야 한다.
// 출력에 API 키·전체 응답 원문을 포함하지 않는다.
import { KmdbClient } from '../src/data/adapters/kmdb/kmdbClient.ts';
import { syncLinkedMovie } from '../src/data/adapters/kmdb/kmdbSyncService.ts';

const args = process.argv.slice(2);
const flag = (name: string): string | null => {
  const found = args.find((a) => a.startsWith(`--${name}=`));
  return found ? found.slice(name.length + 3) : null;
};
const dryRun = args.includes('--dry-run');
const movieIds = (flag('movie-id')?.split(',').filter(Boolean) ?? []).map(Number);

const apiKey = process.env.KMDB_API_KEY;
if (!apiKey) {
  console.error('KMDB_API_KEY가 없습니다. 루트 .env에 키를 설정하세요 (.env.example 참고).');
  process.exit(1);
}
if (movieIds.length === 0 || movieIds.some((id) => !Number.isInteger(id))) {
  console.error('사용법: npm run sync:kmdb -- --movie-id=ID[,ID] [--dry-run]');
  process.exit(1);
}

const client = new KmdbClient({ apiKey });
const opts = { dryRun, log: (m: string) => console.log(m) };

let promoted = 0;
let unchanged = 0;
let errors = 0;

for (const movieId of movieIds) {
  const result = await syncLinkedMovie(client, movieId, opts);
  if (result.outcome === 'promoted') promoted++;
  else if (result.outcome === 'unchanged') unchanged++;
  else if (result.outcome === 'error') {
    errors++;
    console.error(`! movie #${movieId}: ${result.reason}`);
  }
}

console.log(
  `\n${dryRun ? '[dry-run] ' : ''}동기화 요약 — 대상 ${movieIds.length} / 반영 ${promoted} / 변경없음 ${unchanged} / 오류 ${errors}`,
);
process.exit(errors > 0 ? 2 : 0);
