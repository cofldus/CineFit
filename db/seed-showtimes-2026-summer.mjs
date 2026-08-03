// 2026년 여름 실제 상영작(KOBIS 수입, movie_id 4~)의 검증용 합성 회차 시드.
// 실제 회차·가격이 아니다 — 기존 합성 시드와 동일하게 source='스파이크 합성 시드',
// info_status='estimated'로 표기되어 화면 전체에 "검증용 합성 데이터" 배너가 뜬다.
// 실제 회차는 관리자가 공식 예매 페이지에서 확인해 /admin에서 등록하는 것이 정식 경로.
//
// 합성이지만 알려진 사실은 지키지 않는다 → 지킨다:
// - 스파이더맨: 브랜드 뉴 데이는 IMAX 미개봉(오디세이 독점 창) — IMAX관 회차를 만들지 않음.
// - format_versions가 확인된 영화만 해당 프리미엄관 회차 생성, 미확인 영화는 일반관만.
// 날짜는 실행 시점(로컬 오늘)부터 5일 — 시연이 날짜 경과로 낡지 않게 상대 생성.
// 멱등: 재실행 시 이 시드가 만든 회차(합성 출처 + movie_id>=4)를 지우고 다시 넣는다.
import { DatabaseSync } from 'node:sqlite';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.CINEFIT_DB_PATH ?? join(here, '..', 'spikes', 'minimal-db', 'cinefit-spike.db');
if (!existsSync(dbPath)) {
  console.error(`DB가 없습니다: ${dbPath} — 먼저 migrate·seed를 실행하세요.`);
  process.exit(1);
}
const db = new DatabaseSync(dbPath);

const srcSeed = db.prepare(`SELECT id FROM sources WHERE name = '스파이크 합성 시드'`).get()?.id;
if (!srcSeed) {
  console.error('합성 시드 출처가 없습니다 — 기본 seed를 먼저 실행하세요.');
  process.exit(1);
}

const aud = (locLike, no) =>
  db
    .prepare(
      `SELECT a.id FROM auditoriums a JOIN cinema_locations l ON l.id = a.location_id
       WHERE l.name LIKE ? AND a.auditorium_no = ?`,
    )
    .get(`%${locLike}%`, no)?.id ?? null;

const AUD = {
  yongsan_imax: aud('용산아이파크몰', 'IMAX관'),
  yongsan_std: aud('용산아이파크몰', '13관'),
  wangsimni_imax: aud('왕십리', 'IMAX관'),
  cheonho_imax: aud('천호', 'IMAX관'),
  coex_dolby: aud('코엑스', '돌비시네마관'),
  coex_std: aud('코엑스', 'M관'),
  worldtower_splex: aud('월드타워', '수퍼플렉스G관'),
  worldtower_std: aud('월드타워', '7관'),
  yeouido_4dx: aud('여의도', '4DX관'),
  namyangju_dolby: aud('남양주현대아울렛', '돌비시네마관'),
};

const movieByKobis = (code) =>
  db.prepare(`SELECT id, runtime_min FROM movies WHERE kobis_code = ?`).get(code) ?? null;

// [kobis_code, label, [audKey, hhmm, format, price][]]
const PLANS = [
  // 스파이더맨: IMAX 미개봉(사실) — 돌비·수퍼플렉스·4DX·일반만
  ['20262770', '스파이더맨: 브랜드 뉴 데이', [
    ['coex_dolby', '19:20', 'dolby_cinema', 25000],
    ['worldtower_splex', '20:10', 'superplex', 21000],
    ['yeouido_4dx', '18:40', '4dx', 26000],
    ['yongsan_std', '17:00', 'standard', 15000],
  ]],
  ['20233219', '호프', [
    ['worldtower_std', '19:00', 'standard', 14000],
    ['coex_std', '20:20', 'standard', 14000],
  ]],
  ['20261784', '미니언즈 & 몬스터즈', [
    ['yongsan_std', '14:30', 'standard', 15000],
    ['worldtower_splex', '15:40', 'superplex', 21000],
    ['coex_std', '16:50', 'standard', 14000],
  ]],
  // 모아나: format_versions 확인(imax·dolby_cinema·standard)
  ['20259946', '모아나', [
    ['yongsan_imax', '16:20', 'imax', 30000],
    ['wangsimni_imax', '17:10', 'imax', 26000],
    ['coex_dolby', '16:40', 'dolby_cinema', 25000],
    ['yongsan_std', '13:10', 'standard', 15000],
  ]],
  // 토이 스토리 5: format_versions 확인(imax·dolby_cinema·4dx·standard)
  ['20259781', '토이 스토리 5', [
    ['cheonho_imax', '15:00', 'imax', 25000],
    ['coex_dolby', '13:30', 'dolby_cinema', 25000],
    ['yeouido_4dx', '14:20', '4dx', 26000],
    ['worldtower_std', '16:10', 'standard', 14000],
  ]],
  ['20262381', '사랑의 하츄핑: 고래보석의 전설', [
    ['coex_std', '11:30', 'standard', 14000],
    ['yongsan_std', '12:40', 'standard', 15000],
  ]],
  ['20262902', '다윗', [
    ['worldtower_std', '18:20', 'standard', 14000],
  ]],
  ['20264148', '어떻게 해야 했을까?', [
    ['coex_std', '19:50', 'standard', 14000],
  ]],
  ['20242402', '눈동자', [
    ['yongsan_std', '20:30', 'standard', 15000],
    ['worldtower_std', '21:00', 'standard', 14000],
  ]],
  ['20264665', '드림 애니멀즈: 더무비', [
    ['coex_std', '10:40', 'standard', 14000],
    ['worldtower_std', '11:20', 'standard', 14000],
  ]],
];

// 멱등: 이 시드 대상(합성 출처 + KOBIS 수입 영화)의 기존 회차 제거 후 재생성
const targetMovieIds = PLANS.map(([code]) => movieByKobis(code)?.id).filter(Boolean);
if (targetMovieIds.length > 0) {
  db.prepare(
    `DELETE FROM showtimes WHERE source_id = ? AND movie_id IN (${targetMovieIds.map(() => '?').join(',')})`,
  ).run(srcSeed, ...targetMovieIds);
}

const insert = db.prepare(
  `INSERT INTO showtimes (movie_id, auditorium_id, starts_at, ends_at_est, format, price_adult,
     entry_method, data_checked_at, source_id, info_status)
   VALUES (?,?,?,?,?,?, 'manual', ?, ?, 'estimated')`,
);

const pad = (n) => String(n).padStart(2, '0');
const today = new Date();
const dateStr = (offset) => {
  const d = new Date(today);
  d.setDate(today.getDate() + offset);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const checkedAt = new Date().toISOString();

let created = 0;
for (const [code, label, slots] of PLANS) {
  const movie = movieByKobis(code);
  if (!movie) {
    console.warn(`? ${label}(KOBIS ${code}) — DB에 없어 건너뜀`);
    continue;
  }
  const runtime = movie.runtime_min ?? 110;
  slots.forEach(([audKey, hhmm, format, price], i) => {
    const audIdVal = AUD[audKey];
    if (!audIdVal) {
      console.warn(`? ${label} — 상영관 ${audKey} 없음, 건너뜀`);
      return;
    }
    // 각 (영화, 상영관) 조합을 이틀에 걸쳐 배치 — 오늘부터 5일 안에서 분산
    for (const dayOffset of [i % 3, (i % 3) + 2]) {
      const starts = new Date(`${dateStr(dayOffset)}T${hhmm}:00+09:00`);
      const ends = new Date(starts.getTime() + (runtime + 20) * 60_000);
      insert.run(movie.id, audIdVal, starts.toISOString(), ends.toISOString(), format, price, checkedAt, srcSeed);
      created++;
    }
  });
}

console.log(`합성 회차 시드 완료 — ${created}건 (기준일 ${dateStr(0)}~${dateStr(4)}, ${dbPath})`);
console.log('전부 검증용 합성 표시(estimated·합성 시드 출처) — 실제 회차는 /admin 수동 등록이 정식 경로.');
