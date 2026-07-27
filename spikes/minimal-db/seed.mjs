// 최소 DB 생성·시드 — node seed.mjs
// 상영관 사양: 문서 01의 조사 사실을 info_status·confidence와 함께 기록.
// 회차·가격: 파이프라인 검증용 합성 데이터 (source: spike_seed).
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(here, 'cinefit-spike.db');
rmSync(DB_PATH, { force: true });

const db = new DatabaseSync(DB_PATH);
db.exec(readFileSync(join(here, 'schema.sql'), 'utf8'));

const J = JSON.stringify;
const insert = (table, row) => {
  const keys = Object.keys(row);
  const stmt = db.prepare(`INSERT INTO ${table} (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`);
  return stmt.run(...keys.map((k) => row[k])).lastInsertRowid;
};

// ── sources ──────────────────────────────────────────────────────────
const SRC = {};
SRC.seed = insert('sources', { kind: 'spike_seed', name: '스파이크 합성 시드', terms_note: '검증용 합성 데이터 — 실서비스 사용 금지', trust_weight: 0.3 });
SRC.cj = insert('sources', { kind: 'press', name: 'CJ뉴스룸', url: 'https://about.cj.net', trust_weight: 1.0 });
SRC.namu = insert('sources', { kind: 'community', name: '나무위키', url: 'https://namu.wiki', terms_note: 'CC BY-NC-SA — 사실 추출만, 원문 전재 금지', trust_weight: 0.5 });
SRC.ext = insert('sources', { kind: 'community', name: '익스트림무비', url: 'https://extmovie.com', trust_weight: 0.5 });
SRC.muko = insert('sources', { kind: 'community', name: '무비코리아', url: 'https://muko.kr', trust_weight: 0.5 });
SRC.admin = insert('sources', { kind: 'admin', name: '관리자 수동 확인', trust_weight: 0.85 });

// ── movies + specs ───────────────────────────────────────────────────
// spec: [spec_key, value, source, info_status, observed_at, confidence]
const movies = [
  {
    row: { title: '듄: 파트 2', original_title: 'Dune: Part Two', runtime_min: 166, rating: '12세이상관람가', genres: J(['SF', '액션', '드라마']), director: '드니 빌뇌브' },
    release: { country: 'KR', status: 'rerelease_showing', release_date: '2026-07-22', source_id: null, info_status: 'estimated', confidence: 0.3 },
    specs: [
      ['native_ar', '2.39', 'namu', 'multi_source', '2026-07-01', 0.85],
      ['imax_expanded_ar', '1.90', 'namu', 'multi_source', '2026-07-01', 0.85],
      ['filmed_for_imax', true, 'namu', 'multi_source', '2026-07-01', 0.85],
      ['atmos_mix', true, 'namu', 'multi_source', '2026-07-01', 0.85],
      ['imax_sound_mix', true, 'ext', 'single_unverified', '2026-07-01', 0.4],
      ['dolby_vision', true, 'namu', 'multi_source', '2026-07-01', 0.85],
      ['dark_scene_ratio', 0.55, 'admin', 'estimated', '2026-07-27', 0.3],
      ['genre_spectacle', true, 'admin', 'user_report', '2026-07-27', 0.85],
      ['format_versions', ['imax', 'dolby_cinema', '4dx', 'superplex', 'standard'], 'admin', 'multi_source', '2026-07-27', 0.85],
    ],
  },
  {
    row: { title: '오펜하이머', original_title: 'Oppenheimer', runtime_min: 180, rating: '15세이상관람가', genres: J(['드라마', '전기', '스릴러']), director: '크리스토퍼 놀런' },
    release: { country: 'KR', status: 'rerelease_showing', release_date: '2026-07-15', source_id: null, info_status: 'estimated', confidence: 0.3 },
    specs: [
      ['native_ar', '2.20', 'namu', 'multi_source', '2026-07-01', 0.85],
      ['imax_expanded_ar', '1.43', 'namu', 'multi_source', '2026-07-01', 0.85],
      ['film_format', 'imax_15_70', 'namu', 'multi_source', '2026-07-01', 0.85],
      ['filmed_for_imax', true, 'namu', 'multi_source', '2026-07-01', 0.85],
      ['atmos_mix', false, 'namu', 'multi_source', '2026-07-01', 0.85], // 5.1 믹스 — 돌비관 가산 제한 케이스
      ['dark_scene_ratio', 0.35, 'admin', 'estimated', '2026-07-27', 0.3],
      ['genre_spectacle', false, 'admin', 'user_report', '2026-07-27', 0.85],
      ['format_versions', ['imax', 'dolby_cinema', 'standard'], 'admin', 'multi_source', '2026-07-27', 0.85],
    ],
  },
  {
    row: { title: '존 오브 인터레스트', original_title: 'The Zone of Interest', runtime_min: 106, rating: '15세이상관람가', genres: J(['드라마', '역사']), director: '조나단 글레이저' },
    release: { country: 'KR', status: 'rerelease_showing', release_date: '2026-07-22', source_id: null, info_status: 'estimated', confidence: 0.3 },
    specs: [
      ['native_ar', '1.85', 'namu', 'multi_source', '2026-07-01', 0.85],
      ['atmos_mix', true, 'ext', 'single_unverified', '2026-07-01', 0.4],
      ['dark_scene_ratio', 0.2, 'admin', 'estimated', '2026-07-27', 0.3],
      ['genre_spectacle', false, 'admin', 'user_report', '2026-07-27', 0.85],
      ['format_versions', ['standard', 'dolby_cinema', 'superplex'], 'admin', 'estimated', '2026-07-27', 0.3],
    ],
  },
];
const MOV = {};
for (const m of movies) {
  const id = insert('movies', m.row);
  MOV[m.row.title] = id;
  insert('movie_releases', { movie_id: id, ...m.release });
  for (const [k, v, src, st, at, conf] of m.specs) {
    insert('movie_technical_specs', { movie_id: id, spec_key: k, value: J(v), source_id: SRC[src], info_status: st, observed_at: at, confidence: conf });
  }
}

// ── locations (좌표는 추정치) ─────────────────────────────────────────
const LOC = {};
const locations = [
  ['yongsan', 'CGV', 'CGV 용산아이파크몰', 37.5299, 126.9648, '1호선 용산역 직결'],
  ['wangsimni', 'CGV', 'CGV 왕십리', 37.5613, 127.0374, '2호선 왕십리역 직결'],
  ['cheonho', 'CGV', 'CGV 천호', 37.5385, 127.1235, '5·8호선 천호역 인근'],
  ['coex', '메가박스', '메가박스 코엑스', 37.5126, 127.0588, '2호선 삼성역 직결'],
  ['worldtower', '롯데시네마', '롯데시네마 월드타워', 37.5126, 127.1025, '2·8호선 잠실역 직결'],
  ['yeouido', 'CGV', 'CGV 여의도', 37.5215, 126.9243, '5·9호선 여의도역 인근'],
  ['namyangju', '메가박스', '메가박스 남양주현대아울렛 스페이스원', 37.6203, 127.2282, '경춘선 별내역 셔틀'],
];
for (const [key, chain, name, lat, lng, transit] of locations) {
  LOC[key] = insert('cinema_locations', { chain, name, lat, lng, region_code: 'SEOUL_METRO', status: 'operating', transit_note: transit });
}

// ── auditoriums + 현재 유효 specs ────────────────────────────────────
const AUD = {};
const auds = [
  // [key, loc, no, brand, seat, projector, screen, sound, supported_ar, masking, notes, renewal, source, status, observed, conf]
  ['yongsan_imax', 'yongsan', 'IMAX관', 'imax', 624,
    { light_source: 'laser', resolution: '4k', imax_grade: 'gt_dual_laser', dual: true },
    { width_m: 31, height_m: 18.1, aspect: '1.43' }, { format: 'imax_12ch', ceiling: true },
    '1.43', 'none', '국내 유일 GT 듀얼 레이저(문서 01 §2)', null, 'namu', 'multi_source', '2026-07-01', 0.85],
  ['yongsan_std', 'yongsan', '13관', 'standard', 156,
    { light_source: 'laser', resolution: '2k' }, { aspect: '2.39' }, { format: '5.1' },
    '2.39', 'side', null, null, 'seed', 'estimated', '2026-07-27', 0.3],
  ['wangsimni_imax', 'wangsimni', 'IMAX관', 'imax', 372,
    { light_source: 'laser', resolution: '4k', imax_grade: 'cola' },
    { aspect: '1.90' }, { format: 'imax_12ch', ceiling: true },
    '1.90', 'none', null, '2024-09 IMAX LASER(CoLa) 리뉴얼 — CJ뉴스룸', 'cj', 'official', '2026-07-01', 1.0],
  ['cheonho_imax', 'cheonho', 'IMAX관', 'imax', 336,
    { light_source: 'laser', resolution: '4k', imax_grade: 'cola' },
    { aspect: '1.43' }, { format: 'imax_12ch', ceiling: true },
    '1.90', 'none', 'GT 비율(1.43) 스크린 + CoLa 영사기 → 1.43 콘텐츠 풀사이즈 상영 불가(문서 01 "천아맥" 사례)', '2025-12 리뉴얼(CoLa) — 커뮤니티 제보', 'ext', 'user_report', '2025-12-20', 0.5],
  ['coex_dolby', 'coex', '돌비시네마관', 'dolby_cinema', 372,
    { light_source: 'laser', resolution: '4k', dolby_vision: true, dual: true },
    { aspect: '2.39' }, { format: 'atmos', ceiling: true },
    '2.39', 'both', null, null, 'namu', 'multi_source', '2026-07-01', 0.85],
  ['coex_std', 'coex', 'M관', 'standard', 200,
    { light_source: 'xenon', resolution: '2k' }, { aspect: '1.85' }, { format: '5.1' },
    '1.85', 'unknown', null, null, 'seed', 'estimated', '2026-07-27', 0.3],
  ['worldtower_splex', 'worldtower', '수퍼플렉스G관', 'superplex', 622,
    { light_source: 'laser', resolution: '4k', dual: true },
    { width_m: 34, height_m: 13.8, aspect: '2.39' }, { format: 'atmos', ceiling: true },
    '2.39', 'none', '초대형 스크린 — 커뮤니티 실측 복수 일치', null, 'ext', 'user_report', '2026-06-15', 0.7],
  ['worldtower_std', 'worldtower', '7관', 'standard', 180,
    { light_source: 'laser', resolution: '2k' }, { aspect: '2.39' }, { format: '5.1' },
    '2.39', 'side', null, null, 'seed', 'estimated', '2026-07-27', 0.3],
  ['yeouido_4dx', 'yeouido', '4DX관', '4dx', 140,
    { light_source: 'xenon', resolution: '2k' }, { aspect: '2.39' }, { format: '7.1' },
    '2.39', 'none', '모션 시트', null, 'seed', 'single_unverified', '2026-07-27', 0.4],
  ['namyangju_dolby', 'namyangju', '돌비시네마관', 'dolby_cinema', 500,
    { light_source: 'laser', resolution: '4k', dolby_vision: true, dual: true },
    { aspect: '2.39' }, { format: 'atmos', ceiling: true },
    '2.39', 'both', '스크린 크기 순위 출처 충돌(문서 06 §5 샘플) — 대표값 보류', null, 'namu', 'conflict', '2026-07-01', 0.25],
];
for (const [key, loc, no, brand, seat, proj, screen, sound, ar, masking, notes, renewal, src, st, at, conf] of auds) {
  const id = insert('auditoriums', { location_id: LOC[loc], auditorium_no: no, brand, seat_count: seat });
  AUD[key] = id;
  insert('auditorium_specs', {
    auditorium_id: id, valid_from: at, projector: J(proj), screen: J(screen), sound: J(sound),
    supported_ar: ar, masking, notes, renewal_event: renewal,
    source_id: SRC[src], info_status: st, observed_at: at, confidence: conf,
  });
}

// ── observations (사양 필드의 근거 로그) ─────────────────────────────
const obs = [
  ['auditorium', 'cheonho_imax', 'projector.imax_grade', 'cola', 'ext', '2025-12-20', 'user_report', 0.5],
  ['auditorium', 'cheonho_imax', 'screen.aspect', '1.43', 'namu', '2026-01-10', 'user_report', 0.5],
  ['auditorium', 'yongsan_imax', 'projector.imax_grade', 'gt_dual_laser', 'namu', '2026-07-01', 'multi_source', 0.85],
  ['auditorium', 'wangsimni_imax', 'renewal_event', '2024-09 IMAX LASER 리뉴얼', 'cj', '2024-09-27', 'official', 1.0],
  ['auditorium', 'namyangju_dolby', 'screen_size_rank', '국내 최대급', 'namu', '2026-07-01', 'user_report', 0.5],
  ['auditorium', 'namyangju_dolby', 'screen_size_rank', '대전과 투톱', 'muko', '2026-07-01', 'user_report', 0.5],
];
for (const [et, audKey, field, value, src, at, st, conf] of obs) {
  insert('observations', { entity_type: et, entity_id: AUD[audKey], field, value: J(value), source_id: SRC[src], observed_at: at, info_status: st, confidence: conf });
}

// ── showtimes (합성 — 2026-07-28) ────────────────────────────────────
const D = '2026-07-28';
const show = (movie, audKey, hhmm, format, price) => {
  const runtime = movies.find((m) => MOV[m.row.title] === MOV[movie]).row.runtime_min;
  const starts = new Date(`${D}T${hhmm}:00+09:00`);
  const ends = new Date(starts.getTime() + (runtime + 20) * 60_000); // 광고 20분 포함
  insert('showtimes', {
    movie_id: MOV[movie], auditorium_id: AUD[audKey],
    starts_at: starts.toISOString(), ends_at_est: ends.toISOString(),
    format, price_adult: price, entry_method: 'manual',
    data_checked_at: '2026-07-27T12:00:00+09:00', source_id: SRC.seed, info_status: 'estimated',
  });
};
show('듄: 파트 2', 'yongsan_imax', '19:30', 'imax', 30000);
show('듄: 파트 2', 'wangsimni_imax', '20:00', 'imax', 26000);
show('듄: 파트 2', 'cheonho_imax', '19:00', 'imax', 25000);
show('듄: 파트 2', 'coex_dolby', '19:20', 'dolby_cinema', 25000);
show('듄: 파트 2', 'worldtower_splex', '20:10', 'superplex', 21000);
show('듄: 파트 2', 'yeouido_4dx', '18:40', '4dx', 26000);
show('듄: 파트 2', 'yongsan_std', '17:00', 'standard', 15000);
show('오펜하이머', 'yongsan_imax', '14:50', 'imax', 30000);
show('오펜하이머', 'cheonho_imax', '20:30', 'imax', 25000);
show('오펜하이머', 'coex_dolby', '15:40', 'dolby_cinema', 25000);
show('오펜하이머', 'worldtower_std', '19:00', 'standard', 14000);
show('존 오브 인터레스트', 'coex_std', '18:30', 'standard', 14000);
show('존 오브 인터레스트', 'yongsan_std', '19:40', 'standard', 15000);
show('존 오브 인터레스트', 'worldtower_splex', '17:30', 'superplex', 21000);
show('존 오브 인터레스트', 'namyangju_dolby', '19:00', 'dolby_cinema', 25000);

// ── demo user ────────────────────────────────────────────────────────
insert('user_preferences', {
  user_id: 'demo-user',
  explicit: J({ transport: 'transit', viewingCount: 'first' }),
  sensitivity: J({ motionSickness: 0, loudness: 0, brightness: 0, neckBack: 0 }),
  accessibility: J({}),
});

const count = (t) => db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get().n;
for (const t of ['sources', 'movies', 'movie_releases', 'movie_technical_specs', 'cinema_locations', 'auditoriums', 'auditorium_specs', 'showtimes', 'observations', 'user_preferences']) {
  console.log(`${t}: ${count(t)}건`);
}
console.log(`\n생성 완료: ${DB_PATH}`);
db.close();
