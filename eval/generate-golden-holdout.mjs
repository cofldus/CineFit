// 독립 holdout 평가 세트 v1 — eval/golden/v1.json(development/tuning 세트)과 분리된다.
// docs/GOLDEN-DATASET-AUDIT.md 감사에서 드러난 v1의 편중을 의도적으로 메운다:
//   - v1은 balance 우선순위가 45/51(88%), cityhall 출발지가 46/51(90%)로 쏠려 있었다.
//   - holdout은 quality/logistics 우선순위와 cityhall 외 출발지, 현실적인 이동시간·가격
//     상한(v1은 "1분"·"10만원" 같은 극단값 위주였다)을 의도적으로 늘렸다.
// 정직성 원칙은 v1과 동일 — 하드 필터를 엔진 코드에서 독립적으로 재구현해 계산하고,
// 실제 엔진을 실행해 정답을 베끼지 않는다(그러면 holdout이 아니라 또 다른 development set이
// 된다). 소프트 랭킹은 여전히 assert하지 않는다.
import { writeFileSync } from 'node:fs';

const ORIGIN_COORDS = {
  cityhall: { lat: 37.5665, lng: 126.978 },
  gangnam: { lat: 37.4979, lng: 127.0276 },
  hongdae: { lat: 37.557, lng: 126.9236 },
  yeouido: { lat: 37.5219, lng: 126.9245 },
  cheonho: { lat: 37.5385, lng: 127.1235 },
  nowon: { lat: 37.6542, lng: 127.0568 },
};
const TRANSIT_KMH = 22;
const OVERHEAD_MIN = 12;

function haversineKm(lat1, lng1, lat2, lng2) {
  const r = (d) => (d * Math.PI) / 180;
  const a =
    Math.sin(r(lat2 - lat1) / 2) ** 2 + Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(r(lng2 - lng1) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(a));
}
function travelMinutes(origin, dest) {
  const o = ORIGIN_COORDS[origin];
  return Math.round((haversineKm(o.lat, o.lng, dest.lat, dest.lng) / TRANSIT_KMH) * 60 + OVERHEAD_MIN);
}

const LOC = {
  yongsan: { lat: 37.5299, lng: 126.9648 },
  wangsimni: { lat: 37.5615, lng: 127.0378 },
  cheonho: { lat: 37.5384, lng: 127.1237 },
  coex: { lat: 37.5115, lng: 127.0595 },
  worldtower: { lat: 37.5125, lng: 127.1025 },
  yeouido: { lat: 37.5219, lng: 126.9245 },
  namyangju: { lat: 37.6369, lng: 127.2165 },
};

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

/** v1의 computePassing과 동일 로직 — engine.ts의 hardFilter를 독립적으로 재구현. */
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
    if (travelMinutes(req.originId, loc) > req.maxTravelMinutes) return false;
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
    dataCheckedAt: '2026-07-29',
    authors: ['claude-sonnet-5'],
    reviewedByCount: 1,
    disagreement: null,
    reasoning,
  };
}

const scenarios = [];
let n = 1;
const next = () => `h${String(n++).padStart(3, '0')}`;

// A) quality 우선순위 × 3영화 × 3출발지(v1에서 quality는 cityhall 3건뿐이었다)
for (const movieId of [1, 2, 3]) {
  for (const originId of ['gangnam', 'hongdae', 'yeouido']) {
    scenarios.push(
      scenario(
        next(),
        `영화${movieId} — quality 우선순위, 출발지 ${originId}`,
        { movieId, priority: 'quality', originId },
        'v1은 quality 우선순위를 cityhall에서만 확인했다 — 다른 출발지에서도 하드 필터 통과 집합 자체는 우선순위와 무관해야 한다.',
      ),
    );
  }
}

// B) logistics 우선순위 × 3영화 × 3출발지(cheonho/nowon/cityhall은 v1에서 balance로만 봤다)
for (const movieId of [1, 2, 3]) {
  for (const originId of ['cheonho', 'nowon', 'cityhall']) {
    scenarios.push(
      scenario(
        next(),
        `영화${movieId} — logistics 우선순위, 출발지 ${originId}`,
        { movieId, priority: 'logistics', originId },
        'v1은 logistics 우선순위를 cityhall에서만 확인했다 — 우선순위는 소프트 점수에만 영향을 주므로 하드 필터 통과 집합은 balance와 같아야 한다.',
      ),
    );
  }
}

// C) 현실적인 이동시간 상한(v1은 1분·200분 극단값 위주) — 실제로 후보를 갈라내는 값
for (const maxTravelMinutes of [30, 45, 90]) {
  scenarios.push(
    scenario(
      next(),
      `영화1 — 이동시간 상한 ${maxTravelMinutes}분(현실적인 값)`,
      { movieId: 1, maxTravelMinutes },
      'v1의 이동시간 시나리오는 1분(전부 제외)·200분(전부 통과) 극단값뿐이었다 — 실제로 일부만 걸러지는 현실적인 값을 확인한다.',
    ),
  );
}

// D) 자막·목 편안 선호 + 현실적 가격 상한 동시 적용(v1은 선호를 항상 관대한 가격과만 조합했다)
for (const movieId of [1, 2, 3]) {
  scenarios.push(
    scenario(
      next(),
      `영화${movieId} — 자막+목 편안 선호 × 가격 상한 2만원`,
      { movieId, subtitleReadability: true, neckComfort: true, maxPrice: 20_000 },
      'v1은 좌석 선호를 항상 관대한 가격 한도와만 조합했다 — 가격 하드 필터와 동시에 적용해도 통과 집합이 가격 조건만으로 결정되는지 확인.',
    ),
  );
}

// E) 멀미 약간 신경쓰임(1) + IMAX 비허용 동시 적용(v1은 motionSickness=1을 다른 조건과 조합한 적 없다)
scenarios.push(
  scenario(
    next(),
    '영화1 — 멀미 약간 신경쓰임(1) + IMAX 비허용',
    { movieId: 1, motionSickness: 1, allowImax: false },
    'motionSickness=1은 4DX를 하드 제외하지 않는다 — allowImax=false와 동시에 걸어도 4DX는 통과 집합에 남아야 한다.',
  ),
);

// F/G) quality/logistics 우선순위 + 현실적 가격 상한 2만원(우선순위·가격 두 축을 동시에 확인)
for (const priority of ['quality', 'logistics']) {
  for (const movieId of [1, 2, 3]) {
    scenarios.push(
      scenario(
        next(),
        `영화${movieId} — ${priority} 우선순위 × 가격 상한 2만원`,
        { movieId, priority, maxPrice: 20_000 },
        '우선순위는 소프트 점수에만 영향을 주므로, 가격 하드 필터로 걸러지는 통과 집합은 balance일 때와 같아야 한다.',
      ),
    );
  }
}

// H) 이동시간+가격을 동시에 현실적으로 좁혀 하드 필터 조합 효과를 확인(단독으로는 극단적이지 않음)
scenarios.push(
  scenario(
    next(),
    '영화1 — 출발지 홍대, 이동시간 25분 + 가격 상한 16,000원(동시 제약)',
    { movieId: 1, originId: 'hongdae', maxTravelMinutes: 25, maxPrice: 16_000 },
    '개별로는 극단적이지 않은 두 제약(이동시간·가격)을 동시에 걸었을 때의 통과 집합 — v1은 항상 한 번에 하나씩만 좁혔다.',
  ),
);
scenarios.push(
  scenario(
    next(),
    '영화3 — 출발지 노원, 이동시간 40분 + 가격 상한 16,000원(동시 제약)',
    { movieId: 3, originId: 'nowon', maxTravelMinutes: 40, maxPrice: 16_000 },
    '개별로는 극단적이지 않은 두 제약을 동시에 걸었을 때의 통과 집합.',
  ),
);

writeFileSync(
  new URL('./golden/holdout-v1.json', import.meta.url),
  JSON.stringify({ version: 'holdout-v1', scenarios }, null, 2) + '\n',
);
console.log(`홀드아웃 데이터셋 v1 생성 완료 — ${scenarios.length}개 시나리오 (eval/golden/holdout-v1.json)`);
