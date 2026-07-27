// KOBIS 일별 박스오피스 실호출 스파이크
// 실행: node --env-file=.env kobis-boxoffice.mjs [YYYYMMDD]
const KEY = process.env.KOBIS_API_KEY;
if (!KEY) {
  console.error('KOBIS_API_KEY가 없습니다. .env.example을 .env로 복사해 키를 넣으세요.');
  process.exit(1);
}

const targetDt =
  process.argv[2] ??
  new Date(Date.now() - 86400_000).toISOString().slice(0, 10).replaceAll('-', ''); // 기본: 어제

const url = new URL('https://www.kobis.or.kr/kobisopenapi/webservice/rest/boxoffice/searchDailyBoxOfficeList.json');
url.searchParams.set('key', KEY);
url.searchParams.set('targetDt', targetDt);

const res = await fetch(url, { headers: { 'User-Agent': 'CineFit-spike/0.1 (contact: 20211392@sungshin.ac.kr)' } });
console.log(`HTTP ${res.status} — targetDt=${targetDt}`);
const body = await res.json();

if (body.faultInfo) {
  console.error('API 오류:', body.faultInfo);
  process.exit(1);
}

const list = body.boxOfficeResult?.dailyBoxOfficeList ?? [];
console.log(`박스오피스 ${list.length}건 (${body.boxOfficeResult?.boxofficeType})`);
for (const m of list) {
  console.log(`${m.rank.padStart(2)}. [${m.movieCd}] ${m.movieNm} — 개봉 ${m.openDt}, 관객 ${Number(m.audiCnt).toLocaleString()}명`);
}
console.log('\n판정: movieCd(KOBIS 식별자)·개봉일이 구조화되어 수신되면 통과.');
