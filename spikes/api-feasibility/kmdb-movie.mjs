// KMDb(한국영상자료원) 영화 정보 실호출 스파이크 — 기술 정보(포맷·화면비) 존재 여부 확인이 핵심
// 실행: node --env-file=.env kmdb-movie.mjs "영화명" [감독명]
const KEY = process.env.KMDB_API_KEY;
if (!KEY) {
  console.error('KMDB_API_KEY가 없습니다.');
  process.exit(1);
}
const title = process.argv[2];
if (!title) {
  console.error('사용법: node --env-file=.env kmdb-movie.mjs "영화명" [감독명]');
  process.exit(1);
}

const url = new URL('https://api.koreafilm.or.kr/openapi-data2/wisenut/search_api/search_json2.jsp');
url.searchParams.set('collection', 'kmdb_new2');
url.searchParams.set('detail', 'Y');
url.searchParams.set('ServiceKey', KEY);
url.searchParams.set('title', title);
if (process.argv[3]) url.searchParams.set('director', process.argv[3]);
url.searchParams.set('listCount', '10');

const res = await fetch(url, { headers: { 'User-Agent': 'CineFit-spike/0.1 (contact: 20211392@sungshin.ac.kr)' } });
console.log(`HTTP ${res.status}`);
const body = await res.json();
const result = body.Data?.[0];
console.log(`검색 결과 ${result?.Count ?? 0}건:`);

for (const m of result?.Result ?? []) {
  const t = (m.title ?? '').replaceAll('!HS', '').replaceAll('!HE', '').trim().replace(/\s+/g, ' ');
  console.log(`\n- [DOCID ${m.DOCID}] ${t} (${m.prodYear})`);
  console.log(`  감독: ${m.directors?.director?.map((d) => d.directorNm).join(', ') || '?'}`);
  console.log(`  개봉일: ${m.repRlsDate || '?'}, 상영시간: ${m.runtime || '?'}분, 등급: ${m.rating || '?'}`);
  console.log(`  기술정보 — screenArea(화면비): ${m.screenArea || '없음'}, soundEcho(사운드): ${m.soundEcho || '없음'}, fSound: ${m.fSound || '없음'}`);
  console.log(`  스틸: ${m.stlls ? '있음' : '없음'}, 줄거리: ${m.plots?.plot?.[0]?.plotText ? '있음' : '없음'}`);
}
console.log('\n판정: 화면비·사운드 기술 필드가 실제로 채워져 오는지 확인. 비어 있다면 기술 사양은 수동 검증 경로(문서 07)로 확정.');
