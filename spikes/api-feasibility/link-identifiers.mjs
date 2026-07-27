// KOBIS movieCd ↔ KMDb DOCID 식별자 연결 스파이크
// 전략: 제목 정규화 + 감독명 + 제작연도(±1) 매칭. 유일 매칭이면 통과, 복수/0건이면 리포트.
// 실행: node --env-file=.env link-identifiers.mjs "영화명"
const { KOBIS_API_KEY, KMDB_API_KEY } = process.env;
if (!KOBIS_API_KEY || !KMDB_API_KEY) {
  console.error('KOBIS_API_KEY, KMDB_API_KEY 둘 다 필요합니다.');
  process.exit(1);
}
const query = process.argv[2];
if (!query) { console.error('사용법: node --env-file=.env link-identifiers.mjs "영화명"'); process.exit(1); }

const UA = { 'User-Agent': 'CineFit-spike/0.1 (contact: 20211392@sungshin.ac.kr)' };
const norm = (s) => (s ?? '').replaceAll('!HS', '').replaceAll('!HE', '').replace(/[\s:·,\-–—!?.]/g, '').toLowerCase();

// 1) KOBIS 검색
const kobisUrl = new URL('https://www.kobis.or.kr/kobisopenapi/webservice/rest/movie/searchMovieList.json');
kobisUrl.searchParams.set('key', KOBIS_API_KEY);
kobisUrl.searchParams.set('movieNm', query);
const kobisMovies = (await (await fetch(kobisUrl, { headers: UA })).json()).movieListResult?.movieList ?? [];
if (!kobisMovies.length) { console.log('KOBIS 검색 결과 없음'); process.exit(0); }

let linked = 0;
for (const km of kobisMovies.slice(0, 5)) {
  const kmDirectors = (km.directors ?? []).map((d) => norm(d.peopleNm));
  const kmYear = Number(km.prdtYear) || null;

  // 2) KMDb 검색 (제목 기준)
  const kmdbUrl = new URL('https://api.koreafilm.or.kr/openapi-data2/wisenut/search_api/search_json2.jsp');
  kmdbUrl.searchParams.set('collection', 'kmdb_new2');
  kmdbUrl.searchParams.set('ServiceKey', KMDB_API_KEY);
  kmdbUrl.searchParams.set('title', km.movieNm);
  kmdbUrl.searchParams.set('listCount', '20');
  const candidates = (await (await fetch(kmdbUrl, { headers: UA })).json()).Data?.[0]?.Result ?? [];

  // 3) 매칭: 제목 정규화 일치 + (감독 일치 or 연도 ±1)
  const matches = candidates.filter((c) => {
    const titleOk = norm(c.title) === norm(km.movieNm) || norm(c.titleEng) === norm(km.movieNmEn);
    const dirs = (c.directors?.director ?? []).map((d) => norm(d.directorNm));
    const dirOk = kmDirectors.length && dirs.some((d) => kmDirectors.includes(d));
    const yearOk = kmYear && Math.abs(Number(c.prodYear) - kmYear) <= 1;
    return titleOk && (dirOk || yearOk);
  });

  const verdict = matches.length === 1 ? '✅ 유일 매칭' : matches.length === 0 ? '❌ 매칭 없음' : `⚠️ 복수 매칭 ${matches.length}건`;
  console.log(`KOBIS [${km.movieCd}] ${km.movieNm} (${km.prdtYear}) → ${verdict}`);
  for (const m of matches) console.log(`   KMDb DOCID=${m.DOCID} (${m.prodYear}) 감독: ${m.directors?.director?.map((d) => d.directorNm).join(',')}`);
  if (matches.length === 1) linked++;
  await new Promise((r) => setTimeout(r, 300)); // 저빈도 호출 원칙 (문서 07)
}
console.log(`\n결과: ${kobisMovies.slice(0, 5).length}건 중 ${linked}건 유일 연결. 복수/0건 케이스는 aliases 테이블·관리자 검수로 보완(문서 06 §3.5).`);
