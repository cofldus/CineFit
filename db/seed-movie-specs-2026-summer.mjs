// 2026년 여름 실제 상영작 큐레이션 사양 — 웹 공개 출처에서 조사한 값만 기록한다(추정 금지).
// 조사일: 2026-08-03. 출처가 확인되지 않은 영화(한국 독립·다큐·일부 애니)는 의도적으로
// 아무 값도 넣지 않는다 — 빈 값이 틀린 값보다 낫다는 프로젝트 원칙.
//
// 조사 근거(요약):
// - 스파이더맨: 브랜드 뉴 데이 — 소니 공식 확인 보도(2.39:1 스코프 + 1.90:1 플랫 이중
//   마스터), IMDb technical, Forbes/Variety(이번 여름 IMAX 미개봉 — 오디세이 독점 창).
//   1.90:1 플랫 확장판은 IMAX 확장(imax_expanded_ar)이 아니므로 그 키에는 넣지 않는다.
// - 모아나(2026 실사) — IMDb technical(2.39:1, Dolby Atmos, IMAX 6-Track), IMAX·AMC 상영 정보.
// - 토이 스토리 5 — IMDb technical(1.85:1, Dolby Atmos, Dolby Vision), 상영 포맷 목록
//   (IMAX·돌비시네마·4DX 포함).
// - 미니언즈 & 몬스터즈 — IMDb technical + Wikipedia(2.39:1, Dolby Atmos).
// 멱등: (movie_id, spec_key, source_id) UPSERT. 실행: node db/seed-movie-specs-2026-summer.mjs
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

// IMDb 출처 — 사용자 편집 데이터라 나무위키와 같은 community 신뢰 등급(0.5). 다른 독립
// 출처(공식 보도·위키피디아·상영 포맷 공지)와 일치하는 항목만 multi_source로 올린다.
let imdbSourceId = db.prepare(`SELECT id FROM sources WHERE name = 'IMDb'`).get()?.id;
if (!imdbSourceId) {
  db.prepare(
    `INSERT INTO sources (kind, name, url, terms_note, trust_weight)
     VALUES ('community', 'IMDb', 'https://www.imdb.com',
       'IMDb technical specs — 사용자 편집 데이터, 독립 출처와 교차 일치 시에만 multi_source', 0.5)`,
  ).run();
  imdbSourceId = db.prepare(`SELECT id FROM sources WHERE name = 'IMDb'`).get().id;
}

const movieIdByKobis = (code) => db.prepare(`SELECT id FROM movies WHERE kobis_code = ?`).get(code)?.id ?? null;

const OBSERVED_AT = '2026-08-03';

// [kobis_code, movieLabel, spec_key, value(JSON), info_status, confidence]
const SPECS = [
  // 스파이더맨: 브랜드 뉴 데이 (KOBIS 20262770)
  ['20262770', '스파이더맨: 브랜드 뉴 데이', 'native_ar', '2.39', 'multi_source', 0.85],
  ['20262770', '스파이더맨: 브랜드 뉴 데이', 'atmos_mix', 'true', 'single_unverified', 0.5],

  // 미니언즈 & 몬스터즈 (KOBIS 20261784)
  ['20261784', '미니언즈 & 몬스터즈', 'native_ar', '2.39', 'multi_source', 0.85],
  ['20261784', '미니언즈 & 몬스터즈', 'atmos_mix', 'true', 'multi_source', 0.75],

  // 모아나 (2026 실사, KOBIS 20259946)
  ['20259946', '모아나', 'native_ar', '2.39', 'multi_source', 0.85],
  ['20259946', '모아나', 'atmos_mix', 'true', 'multi_source', 0.75],
  ['20259946', '모아나', 'imax_sound_mix', 'true', 'single_unverified', 0.5],
  ['20259946', '모아나', 'format_versions', '["imax","dolby_cinema","standard"]', 'multi_source', 0.75],

  // 토이 스토리 5 (KOBIS 20259781)
  ['20259781', '토이 스토리 5', 'native_ar', '1.85', 'multi_source', 0.85],
  ['20259781', '토이 스토리 5', 'atmos_mix', 'true', 'multi_source', 0.85],
  ['20259781', '토이 스토리 5', 'dolby_vision', 'true', 'single_unverified', 0.5],
  ['20259781', '토이 스토리 5', 'format_versions', '["imax","dolby_cinema","4dx","standard"]', 'multi_source', 0.75],
];

const upsert = db.prepare(
  `INSERT INTO movie_technical_specs (movie_id, spec_key, value, source_id, info_status, observed_at, confidence)
   VALUES (?,?,?,?,?,?,?)
   ON CONFLICT (movie_id, spec_key, source_id)
   DO UPDATE SET value=excluded.value, info_status=excluded.info_status,
                 observed_at=excluded.observed_at, confidence=excluded.confidence`,
);

let inserted = 0;
let skipped = 0;
for (const [kobis, label, key, value, status, confidence] of SPECS) {
  const movieId = movieIdByKobis(kobis);
  if (!movieId) {
    console.warn(`? ${label}(KOBIS ${kobis}) — DB에 없어 건너뜀 (먼저 sync:kobis 필요)`);
    skipped++;
    continue;
  }
  upsert.run(movieId, key, value, imdbSourceId, status, OBSERVED_AT, confidence);
  inserted++;
}

console.log(`영화 사양 시드 완료 — 반영 ${inserted}건, 건너뜀 ${skipped}건 (${dbPath})`);
console.log(
  '사양 미기록(출처 미확인, 의도적): 호프 · 하츄핑 · 다윗 · 어떻게 해야 했을까? · 눈동자 · 드림 애니멀즈',
);
