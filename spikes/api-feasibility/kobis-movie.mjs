// KOBIS 영화 목록·상세 실호출 스파이크 — 상영타입(showTypes) 확인이 핵심
// 실행: node --env-file=.env kobis-movie.mjs "영화명"
const KEY = process.env.KOBIS_API_KEY;
if (!KEY) {
  console.error('KOBIS_API_KEY가 없습니다.');
  process.exit(1);
}
const movieNm = process.argv[2];
if (!movieNm) {
  console.error('사용법: node --env-file=.env kobis-movie.mjs "영화명"');
  process.exit(1);
}

const BASE = 'https://www.kobis.or.kr/kobisopenapi/webservice/rest/movie';
const UA = { 'User-Agent': 'CineFit-spike/0.1 (contact: 20211392@sungshin.ac.kr)' };

// 1) 영화 목록 검색 → movieCd 확보
const listUrl = new URL(`${BASE}/searchMovieList.json`);
listUrl.searchParams.set('key', KEY);
listUrl.searchParams.set('movieNm', movieNm);
const listBody = await (await fetch(listUrl, { headers: UA })).json();
if (listBody.faultInfo) { console.error('API 오류:', listBody.faultInfo); process.exit(1); }

const movies = listBody.movieListResult?.movieList ?? [];
console.log(`"${movieNm}" 검색 결과 ${movies.length}건:`);
for (const m of movies.slice(0, 10)) {
  console.log(`- [${m.movieCd}] ${m.movieNm} (${m.prdtYear ?? '?'}) 감독: ${m.directors?.map((d) => d.peopleNm).join(',') || '?'} 개봉: ${m.openDt || '미개봉'}`);
}
if (!movies.length) process.exit(0);

// 2) 첫 결과 상세 조회 → showTypes(상영형태)·심의등급 확인
const movieCd = movies[0].movieCd;
const infoUrl = new URL(`${BASE}/searchMovieInfo.json`);
infoUrl.searchParams.set('key', KEY);
infoUrl.searchParams.set('movieCd', movieCd);
const info = (await (await fetch(infoUrl, { headers: UA })).json()).movieInfoResult?.movieInfo;

console.log(`\n상세 [${movieCd}] ${info.movieNm} / ${info.movieNmEn}`);
console.log(`- 상영시간: ${info.showTm}분, 개봉일: ${info.openDt}, 제작연도: ${info.prdtYear}`);
console.log(`- 장르: ${info.genres?.map((g) => g.genreNm).join(', ')}`);
console.log(`- 감독: ${info.directors?.map((d) => d.peopleNm).join(', ')}`);
console.log(`- 등급: ${info.audits?.map((a) => a.watchGradeNm).join(', ') || '미등록'}`);
console.log(`- 상영형태(showTypes): ${info.showTypes?.map((t) => `${t.showTypeGroupNm}/${t.showTypeNm}`).join(' | ') || '없음'}`);
console.log('\n판정: showTypes에 IMAX·4D 등 포맷 정보가 오는지 확인. 온다면 movie_format_versions 시드 소스로 사용 가능.');
