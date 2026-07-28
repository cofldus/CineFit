// 골든 추천 데이터셋 v1 생성기 — docs/GOLDEN-DATASET.md 참고.
// 정직성 원칙: 소프트 점수(축별 가중 합산) 순위는 손으로 검증할 수 없으므로 "예상 Top1"은
// 통과 후보가 정확히 1개일 때만 채운다. "허용 Top3"는 통과 후보가 3개 이하일 때만(전부가
// 반드시 Top3에 들어가므로 자명하게 참) 채운다. 그 밖의 소프트 순위는 assert하지 않는다 —
// 대신 하드 필터(허용 포맷·멀미·이동시간·가격·휠체어·배급 버전) 결과는 엔진 코드의 문서화된
// 규칙(src/domain/recommendation/engine.ts hardFilter, docs/05 §3)에서 직접 계산하므로
// 100% 검증 가능하다. 단일 작성자(claude-fable-5) 1차 검토— 2인 이상 교차 검토 전이라는
// 사실을 각 시나리오에 명시한다(섹션 13 — 억지로 단일 정답을 만들지 않는다).
import { writeFileSync } from 'node:fs';

const ORIGIN = { id: 'cityhall', lat: 37.5665, lng: 126.978 };
const TRANSIT_KMH = 22;
const OVERHEAD_MIN = 12;

function haversineKm(lat1, lng1, lat2, lng2) {
  const r = (d) => (d * Math.PI) / 180;
  const a =
    Math.sin(r(lat2 - lat1) / 2) ** 2 + Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(r(lng2 - lng1) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(a));
}
function travelMinutes(dest) {
  return Math.round((haversineKm(ORIGIN.lat, ORIGIN.lng, dest.lat, dest.lng) / TRANSIT_KMH) * 60 + OVERHEAD_MIN);
}

// 위치는 db/seed-seat-zones.mjs·spikes/minimal-db/seed.mjs와 동일한 실제 좌표(대략치)
const LOC = {
  yongsan: { lat: 37.5299, lng: 126.9648 },
  wangsimni: { lat: 37.5615, lng: 127.0378 },
  cheonho: { lat: 37.5384, lng: 127.1237 },
  coex: { lat: 37.5115, lng: 127.0595 },
  worldtower: { lat: 37.5125, lng: 127.1025 },
  yeouido: { lat: 37.5219, lng: 126.9245 },
  namyangju: { lat: 37.6369, lng: 127.2165 },
};

// [auditoriumId, movieId, format, priceAdult, location]
const SHOWTIMES = [
  [1, 1, 'imax', 30000, LOC.yongsan],
  [2, 1, 'standard', 15000, LOC.yongsan],
  [3, 1, 'imax', 26000, LOC.wangsimni],
  [4, 1, 'imax', 25000, LOC.cheonho],
  [5, 1, 'dolby_cinema', 25000, LOC.coex],
  [7, 1, 'superplex', 21000, LOC.worldtower],
  [9, 1, '4dx', 26000, LOC.yeouido],
  [1, 2, 'imax', 30000, LOC.yongsan],
  [4, 2, 'imax', 25000, LOC.cheonho],
  [5, 2, 'dolby_cinema', 25000, LOC.coex],
  [8, 2, 'standard', 14000, LOC.worldtower],
  [2, 3, 'standard', 15000, LOC.yongsan],
  [6, 3, 'standard', 14000, LOC.coex],
  [7, 3, 'superplex', 21000, LOC.worldtower],
  [10, 3, 'dolby_cinema', 25000, LOC.namyangju],
];

const FORMAT_VERSIONS = {
  1: ['imax', 'dolby_cinema', '4dx', 'superplex', 'standard'],
  2: ['imax', 'dolby_cinema', 'standard'],
  3: ['standard', 'dolby_cinema', 'superplex'],
};

const DEFAULT_REQUEST = {
  originId: 'cityhall',
  date: '2026-07-28',
  maxTravelMinutes: 200,
  maxPrice: 100_000,
  priority: 'balance',
  allowImax: true,
  allowDolby: true,
  allowStandard: true,
  motionSickness: 0,
  subtitleReadability: false,
  neckComfort: false,
  wheelchair: false,
};

/** hardFilter(engine.ts)를 그대로 재현 — 배급 버전 제외까지 포함해 통과 후보를 계산한다. */
function computePassing(movieId, req) {
  const requiredVersion = (format) => (format === 'superplex' ? 'standard' : format);
  const versions = FORMAT_VERSIONS[movieId];
  return SHOWTIMES.filter(([aud, mv, format, price, loc]) => {
    if (mv !== movieId) return false;
    if (!versions.includes(requiredVersion(format))) return false;
    const allowed =
      (format === 'imax' && req.allowImax) ||
      (format === 'dolby_cinema' && req.allowDolby) ||
      ((format === 'standard' || format === 'superplex') && req.allowStandard) ||
      format === '4dx';
    if (!allowed) return false;
    if (req.motionSickness === 2 && format === '4dx') return false;
    if (travelMinutes(loc) > req.maxTravelMinutes) return false;
    if (price > req.maxPrice) return false;
    if (req.wheelchair) return false;
    return true;
  }).map(([aud]) => aud);
}

function scenario(id, description, overrides, reasoning) {
  const request = { movieId: overrides.movieId, ...DEFAULT_REQUEST, ...overrides };
  const passing = computePassing(request.movieId, request);
  return {
    id,
    description,
    request,
    expectEmpty: passing.length === 0,
    expectedTop1AuditoriumId: passing.length === 1 ? passing[0] : null,
    acceptableTop3AuditoriumIds: passing.length > 0 && passing.length <= 3 ? [...passing].sort((a, b) => a - b) : null,
    mustExcludeAuditoriumIds: SHOWTIMES.filter(([, mv]) => mv === request.movieId)
      .map(([aud]) => aud)
      .filter((aud) => !passing.includes(aud))
      .sort((a, b) => a - b),
    dataCheckedAt: '2026-07-28',
    authors: ['claude-fable-5'],
    reviewedByCount: 1,
    disagreement: null,
    reasoning,
  };
}

const scenarios = [];
let n = 1;
const next = () => `g${String(n++).padStart(3, '0')}`;

// 1) 기본 조건 × 영화 3편 × 우선순위 3종 — 관대한 이동·가격 한도, 하드 필터 배제 없음 확인
for (const movieId of [1, 2, 3]) {
  for (const priority of ['balance', 'quality', 'logistics']) {
    scenarios.push(
      scenario(
        next(),
        `영화${movieId} 기본 조건(${priority}) — 배급 버전 내 모든 포맷 허용`,
        { movieId, priority },
        '관대한 이동시간(200분)·가격(10만원) 한도라 하드 필터로 제외되는 후보가 없어야 한다(배급 버전 미보유 포맷 제외).',
      ),
    );
  }
}

// 2) 포맷 허용 차단 — 허용 안 하면 그 포맷은 반드시 제외
for (const movieId of [1, 2, 3]) {
  scenarios.push(
    scenario(next(), `영화${movieId} — IMAX 비허용`, { movieId, allowImax: false }, 'allowImax=false면 imax 포맷 후보는 항상 제외된다(hardFilter).'),
  );
  scenarios.push(
    scenario(next(), `영화${movieId} — Dolby Cinema 비허용`, { movieId, allowDolby: false }, 'allowDolby=false면 dolby_cinema 포맷 후보는 항상 제외된다.'),
  );
  scenarios.push(
    scenario(
      next(),
      `영화${movieId} — 일반관(대형관 포함) 비허용`,
      { movieId, allowStandard: false },
      'allowStandard=false면 standard·superplex 포맷 후보가 모두 제외된다(대형 일반관도 같은 그룹).',
    ),
  );
}

// 3) 4DX·멀미 — 영화1만 4DX 후보 보유
scenarios.push(
  scenario(next(), '영화1 — 멀미 매우 심함(4DX 하드 제외)', { movieId: 1, motionSickness: 2 }, 'motionSickness=2면 4DX 후보는 allowImax/Dolby/Standard와 무관하게 항상 제외된다.'),
);
scenarios.push(
  scenario(next(), '영화1 — 멀미 약간 신경쓰임(4DX 유지)', { movieId: 1, motionSickness: 1 }, 'motionSickness=1은 4DX를 소프트 점수로만 반영 — 하드 제외 없음.'),
);

// 4) 휠체어 — 접근성 확인된 관이 하나도 없어 항상 빈 결과 (docs/05 §3 — 미확인 관도 제외)
for (const movieId of [1, 2, 3]) {
  scenarios.push(
    scenario(
      next(),
      `영화${movieId} — 휠체어 접근 필수`,
      { movieId, wheelchair: true },
      '시드 데이터에 접근성이 official로 확인된 상영관이 없어 wheelchair=true는 항상 빈 결과가 된다(점수 보상 없이 하드 제외 — 알려진 데이터 한계, docs/BETA-LIMITATIONS.md).',
    ),
  );
}

// 5) 극단적 이동시간/가격 — 전부 제외(너무 타이트) vs 전부 통과(관대) 재확인
for (const movieId of [1, 2, 3]) {
  scenarios.push(
    scenario(next(), `영화${movieId} — 이동시간 상한 1분(비현실적으로 타이트)`, { movieId, maxTravelMinutes: 1 }, '이동 추정 최소값(오버헤드 12분)보다 작은 한도라 모든 후보가 이동시간 초과로 제외된다.'),
  );
  scenarios.push(
    scenario(next(), `영화${movieId} — 가격 상한 1000원(비현실적으로 타이트)`, { movieId, maxPrice: 1000 }, '시드 최저가(14,000원)보다 낮은 상한이라 모든 후보가 가격 초과로 제외된다.'),
  );
}

// 6) 출발지 다양화 — 각 지점에서 영화1 기본 조건 (이동시간 하드 필터가 지점별로 다르게 작동하는지)
for (const originId of ['gangnam', 'hongdae', 'yeouido', 'cheonho', 'nowon']) {
  scenarios.push(
    scenario(next(), `영화1 — 출발지 ${originId}, 기본 조건`, { movieId: 1, originId }, '관대한 한도(200분)라 출발지와 무관하게 배급 버전 내 포맷은 전부 통과해야 한다.'),
  );
}

// 7) 자막·목 편안 선호(소프트 점수만 — 하드 제외 없음, 통과 후보 불변 확인용)
for (const movieId of [1, 2, 3]) {
  scenarios.push(
    scenario(
      next(),
      `영화${movieId} — 자막 가독+목 편안 선호(소프트 반영만)`,
      { movieId, subtitleReadability: true, neckComfort: true },
      '좌석 선호는 좌석 존 점수(SeatQuality)에만 영향 — 하드 필터 통과 후보 집합은 기본 조건과 동일해야 한다.',
    ),
  );
}

// 8) 두 조건 동시 차단 — 통과 후보를 1~3개로 좁혀 Top1/Top3 자동 검증이 걸리는 케이스를 늘린다
scenarios.push(scenario(next(), '영화1 — IMAX+Dolby 비허용(4DX·일반·수퍼플렉스만)', { movieId: 1, allowImax: false, allowDolby: false }, '통과 후보 3개(4dx,standard,superplex) — 전부 허용 Top3.'));
scenarios.push(scenario(next(), '영화1 — Dolby+일반관 비허용(IMAX·4DX만)', { movieId: 1, allowDolby: false, allowStandard: false }, '통과 후보 4개(imax×3, 4dx) — mustExclude만 확인.'));
scenarios.push(scenario(next(), '영화1 — IMAX+일반관 비허용(Dolby·4DX만)', { movieId: 1, allowImax: false, allowStandard: false }, '통과 후보 2개(dolby, 4dx) — 허용 Top3.'));
scenarios.push(scenario(next(), '영화1 — IMAX+Dolby+일반관 전부 비허용(4DX만)', { movieId: 1, allowImax: false, allowDolby: false, allowStandard: false }, '4DX 한 개만 남아 Top1이 고정된다.'));
scenarios.push(scenario(next(), '영화2 — IMAX 비허용', { movieId: 2, allowImax: false }, '통과 후보 2개(dolby, standard) — 허용 Top3.'));
scenarios.push(scenario(next(), '영화2 — IMAX+Dolby 비허용(일반관만)', { movieId: 2, allowImax: false, allowDolby: false }, '일반관 한 개만 남아 Top1이 고정된다.'));
scenarios.push(scenario(next(), '영화3 — Dolby+일반관 비허용(수퍼플렉스만)', { movieId: 3, allowDolby: false, allowStandard: false }, '수퍼플렉스 한 개만 남아 Top1이 고정된다(배급 버전에 standard 포함되어 통과).'));
scenarios.push(scenario(next(), '영화3 — 일반관 비허용(수퍼플렉스+Dolby)', { movieId: 3, allowStandard: false }, '통과 후보 2개(superplex, dolby) — 허용 Top3.'));

// 9) 현실적인 가격 상한 — 하드 필터가 아니라 실제 가격 분포로 후보를 좁히는 케이스
scenarios.push(scenario(next(), '영화1 — 가격 상한 2만원(일반관만 통과)', { movieId: 1, maxPrice: 20_000 }, '시드 가격상 2만원 이하는 standard(15,000원)뿐 — Top1 고정.'));
scenarios.push(scenario(next(), '영화2 — 가격 상한 2만원(일반관만 통과)', { movieId: 2, maxPrice: 20_000 }, '시드 가격상 2만원 이하는 standard(14,000원)뿐 — Top1 고정.'));
scenarios.push(scenario(next(), '영화3 — 가격 상한 2만원(일반관 2곳만 통과)', { movieId: 3, maxPrice: 20_000 }, '시드 가격상 2만원 이하는 standard 2곳(15,000/14,000원) — 허용 Top3.'));

// 10) 잘못된 날짜 — 시드에 해당 날짜 회차 자체가 없어 항상 빈 결과(하드 필터 이전에 후보가 0개)
for (const movieId of [1, 2, 3]) {
  scenarios.push({
    id: next(),
    description: `영화${movieId} — 시드에 없는 날짜(2026-08-05)`,
    request: { movieId, ...DEFAULT_REQUEST, date: '2026-08-05' },
    expectEmpty: true,
    expectedTop1AuditoriumId: null,
    acceptableTop3AuditoriumIds: null,
    mustExcludeAuditoriumIds: [],
    dataCheckedAt: '2026-07-28',
    authors: ['claude-fable-5'],
    reviewedByCount: 1,
    disagreement: null,
    reasoning: '시드 회차는 전부 2026-07-28 하루뿐이라 다른 날짜는 하드 필터 이전에 후보 자체가 0개다.',
  });
}

writeFileSync(new URL('./golden/v1.json', import.meta.url), JSON.stringify({ version: 'v1', scenarios }, null, 2) + '\n');
console.log(`골든 데이터셋 v1 생성 완료 — ${scenarios.length}개 시나리오 (eval/golden/v1.json)`);
