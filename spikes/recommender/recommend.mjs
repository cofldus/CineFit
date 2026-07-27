// 추천 엔진 최소 검증 스파이크 — 문서 05 파이프라인의 축소 구현
// 실행: node recommend.mjs [--movie 듄] [--origin 37.5665,126.9780] [--priority balance|quality|logistics|format]
//        [--maxTravel 60] [--maxPrice 40000] [--motionSickness 0|1|2] [--date 2026-07-28]
// 축소 범위: SeatQuality·UserPreferenceMatch·AccessibilityFit은 중립 0.5(추정 라벨), 좌석·잔여석 미구현.
import { DatabaseSync } from 'node:sqlite';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const db = new DatabaseSync(join(here, '..', 'minimal-db', 'cinefit-spike.db'), { readOnly: false });

// ── CLI ──────────────────────────────────────────────────────────────
const arg = (name, def) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : def;
};
const req = {
  movieQuery: arg('movie', '듄'),
  origin: arg('origin', '37.5665,126.9780').split(',').map(Number), // 기본: 서울시청
  priority: arg('priority', 'balance'),
  maxTravelMinutes: Number(arg('maxTravel', 60)),
  maxPrice: Number(arg('maxPrice', 40000)),
  motionSickness: Number(arg('motionSickness', 0)),
  date: arg('date', '2026-07-28'),
};

// topPriority 가중치 프리셋 (문서 05 §5)
const PRESETS = {
  balance: { W1: 0.18, W2: 0.15, W3: 0.12, W4: 0.12, W5: 0.10, W6: 0.05, W7: 0.18, W8: 0.10 },
  quality: { W1: 0.25, W2: 0.22, W3: 0.15, W4: 0.10, W5: 0.08, W6: 0.05, W7: 0.10, W8: 0.05 },
  logistics: { W1: 0.10, W2: 0.08, W3: 0.08, W4: 0.08, W5: 0.08, W6: 0.05, W7: 0.30, W8: 0.23 },
  format: { W1: 0.32, W2: 0.15, W3: 0.18, W4: 0.08, W5: 0.07, W6: 0.05, W7: 0.10, W8: 0.05 },
};
const W = PRESETS[req.priority] ?? PRESETS.balance;
const NOW = new Date('2026-07-27T12:00:00+09:00'); // 스파이크 기준 시각(시드 확인일과 정합)

// ── 영화 로드 + 대표 사양 산출 (confidence·최신성 우선 — 문서 06 §4 축소) ──
const movie = db.prepare(`SELECT * FROM movies WHERE title LIKE ?`).get(`%${req.movieQuery}%`);
if (!movie) { console.error(`영화 없음: "${req.movieQuery}"`); process.exit(1); }

const specRows = db.prepare(`
  SELECT s.*, src.name AS source_name FROM movie_technical_specs s
  LEFT JOIN sources src ON src.id = s.source_id
  WHERE s.movie_id = ? ORDER BY s.confidence DESC, s.observed_at DESC`).all(movie.id);
const spec = {}; // 대표값: spec_key당 최고 신뢰 레코드
for (const r of specRows) if (!spec[r.spec_key]) spec[r.spec_key] = { ...r, value: JSON.parse(r.value) };
const VERIFIED = new Set(['official', 'multi_source']);

// ── 후보 로드 (회차 + 현재 유효 관 사양 + 위치) ──────────────────────
const shows = db.prepare(`
  SELECT st.*, a.brand, a.auditorium_no, a.seat_count, a.status AS aud_status,
         l.chain, l.name AS loc_name, l.lat, l.lng, l.status AS loc_status, l.transit_note,
         sp.projector, sp.screen, sp.sound, sp.supported_ar, sp.masking, sp.notes AS spec_notes,
         sp.info_status AS spec_status, sp.observed_at AS spec_observed, sp.confidence AS spec_conf,
         ssrc.name AS spec_source
  FROM showtimes st
  JOIN auditoriums a ON a.id = st.auditorium_id
  JOIN cinema_locations l ON l.id = a.location_id
  LEFT JOIN auditorium_specs sp ON sp.auditorium_id = a.id AND sp.valid_to IS NULL
  LEFT JOIN sources ssrc ON ssrc.id = sp.source_id
  WHERE st.movie_id = ? AND date(st.starts_at) = ?`).all(movie.id, req.date);

// ── 하드 필터 (문서 05 §3 — 점수 상쇄 금지) ─────────────────────────
const haversineKm = ([lat1, lng1], lat2, lng2) => {
  const r = (d) => (d * Math.PI) / 180;
  const a = Math.sin(r(lat2 - lat1) / 2) ** 2 + Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(r(lng2 - lng1) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(a));
};
const travelMin = (s) => Math.round((haversineKm(req.origin, s.lat, s.lng) / 22) * 60 + 12); // 대중교통 근사

const excluded = [];
const candidates = shows.filter((s) => {
  const t = travelMin(s);
  const reject = (why) => (excluded.push({ s, why }), false);
  if (s.loc_status !== 'operating' || s.aud_status !== 'operating') return reject('운영 상태 미확정·중단');
  if (t > req.maxTravelMinutes) return reject(`이동 ${t}분 > 한도 ${req.maxTravelMinutes}분`);
  if (s.price_adult > req.maxPrice) return reject(`가격 ${s.price_adult.toLocaleString()}원 > 한도`);
  if (req.motionSickness === 2 && s.format === '4dx') return reject('멀미 민감(2) — 4DX 제외');
  const versions = spec.format_versions?.value ?? [];
  if (!versions.includes(s.format)) return reject(`${s.format} 버전 배급 미확인`);
  return true;
});

// ── 축 점수 ──────────────────────────────────────────────────────────
const clamp = (x) => Math.max(0, Math.min(1, x));
const freshness = (dateStr, halfLifeDays) => {
  const d = Math.max(0, (NOW - new Date(dateStr)) / 86400_000);
  return Math.exp((-Math.LN2 * d) / halfLifeDays);
};

function score(s) {
  const proj = JSON.parse(s.projector ?? '{}');
  const screen = JSON.parse(s.screen ?? '{}');
  const sound = JSON.parse(s.sound ?? '{}');
  const pos = [], neg = [], unc = [], used = []; // 설명은 점수 계산에 쓰인 특징량에서만 (문서 05 §7)
  const use = (row) => row && used.push({ conf: row.confidence, at: row.observed_at, status: row.info_status });
  const useSpec = (key) => { use(spec[key]); return spec[key]; };

  // 4.1 FilmFormatMatch
  let ffm = 0;
  if (s.format === 'imax') {
    const ar = useSpec('imax_expanded_ar');
    if (ar && VERIFIED.has(ar.info_status)) { ffm += 0.35; pos.push(`${ar.value}:1 확장 화면비 확인(${ar.source_name})`); }
    else if (ar) { ffm += 0.10; unc.push(`IMAX 확장비 미확인(${ar.info_status}) — 확인되면 순위가 바뀔 수 있음`); }
    else unc.push('IMAX 확장비 정보 없음');
    if (useSpec('filmed_for_imax')?.value) { ffm += 0.15; pos.push('IMAX 인증 카메라 촬영'); }
    if (ar && s.supported_ar) {
      if (Number(s.supported_ar) <= Number(ar.value)) { ffm += 0.20; pos.push(`이 관이 확장비 ${ar.value}:1 실제 표시 가능(지원 ${s.supported_ar}:1)`); }
      else neg.push(`영화 확장비 ${ar.value}:1인데 관 지원은 ${s.supported_ar}:1 — 풀사이즈 상영 불가`);
    }
    const im = useSpec('imax_sound_mix');
    if (im?.value && VERIFIED.has(im.info_status)) { ffm += 0.15; pos.push('IMAX 사운드 믹스 확인'); }
    else if (im?.value) { ffm += 0.05; unc.push(`IMAX 사운드 믹스 ${im.info_status}`); }
    if (useSpec('genre_spectacle')?.value) ffm += 0.15;
  } else if (s.format === 'dolby_cinema') {
    ffm += 0.20;
    if (useSpec('dolby_vision')?.value) { ffm += 0.30; pos.push('돌비 비전 마스터 확인'); }
    const at = useSpec('atmos_mix');
    if (at?.value) { ffm += 0.25; pos.push('애트모스 믹스 확인'); }
    else if (at && at.value === false) neg.push('애트모스 믹스 없음(5.1) — 돌비관 사운드 이점 제한');
    const dark = useSpec('dark_scene_ratio');
    if (dark) ffm += clamp(dark.value) * 0.45 * 0.55; // 어두운 장면 비중 가중(≤0.25)
  } else if (s.format === '4dx') {
    ffm = useSpec('genre_spectacle')?.value ? 0.6 : 0.25;
    if (!spec.genre_spectacle?.value) neg.push('대사 중심 작품 — 4DX 효과 궁합 낮음');
    unc.push('4DX 효과-서사 궁합은 추정');
  } else { // superplex·standard: 일반 대형관 경로 (문서 05 §4.1 마지막 규칙)
    ffm = 0.35;
    const nat = useSpec('native_ar');
    if (nat && screen.aspect && Math.abs(Number(nat.value) - Number(screen.aspect)) < 0.2) {
      ffm += 0.15; pos.push(`영화 화면비 ${nat.value}:1과 스크린 비율 일치`);
    } else if (nat && screen.aspect) neg.push(`영화 ${nat.value}:1 × 스크린 ${screen.aspect}:1 — 상하/좌우 여백`);
    if ((screen.width_m ?? 0) >= 30) { ffm += 0.2; pos.push(`초대형 스크린(폭 ${screen.width_m}m)`); }
    if (spec.atmos_mix?.value && sound.format === 'atmos') { ffm += 0.1; pos.push('애트모스 믹스 × 애트모스관'); }
  }
  ffm = clamp(ffm);

  // 4.2 AuditoriumQuality (결측 → 중립 0.5 + DataConfidence 감점은 used에 반영)
  const szScore = screen.width_m ? clamp(screen.width_m / 32) : 0.5;
  if (!screen.width_m) unc.push('스크린 실측 크기 미확인');
  const pjScore = proj.light_source === 'laser' ? (proj.resolution === '4k' ? (proj.dual ? 1 : 0.9) : 0.75) : proj.light_source === 'xenon' ? 0.5 : 0.5;
  const sdScore = { imax_12ch: 1, atmos: 0.95, '7.1': 0.7, '5.1': 0.6 }[sound.format] ?? 0.5;
  const mkScore = { both: 1, side: 0.85, top: 0.85, none: 0.6, unknown: 0.5 }[s.masking] ?? 0.5;
  const audQ = clamp(0.3 * szScore + 0.3 * pjScore + 0.25 * sdScore + 0.15 * mkScore);
  used.push({ conf: s.spec_conf ?? 0.3, at: s.spec_observed ?? '2026-07-27', status: s.spec_status ?? 'estimated' });

  // 4.3 PresentationMatch — 배급 버전 중 이 회차 포맷의 상대 적합도
  const best = spec.imax_expanded_ar ? 'imax' : spec.dolby_vision?.value ? 'dolby_cinema' : 'standard';
  const pm = s.format === best ? 1 : s.format === 'standard' ? 0.6 : 0.75;

  // 4.4~4.6 스파이크 중립값
  const seatQ = 0.5, userPref = 0.5, accFit = 0.5;
  unc.push('좌석 존·잔여석 미구현 — 추정치');

  // 4.7 Convenience
  const t = travelMin(s);
  const conv = clamp(1 - t / 90);
  (t <= 30 ? pos : neg).push(`이동 약 ${t}분(${s.transit_note ?? '경로 미확인'})`);

  // 4.8 PriceValue
  const pv = clamp(((ffm * 0.6 + audQ * 0.4) * 15000) / s.price_adult);
  const minPrice = Math.min(...candidates.map((c) => c.price_adult));
  if (s.price_adult - minPrice >= 5000) neg.push(`가격 ${s.price_adult.toLocaleString()}원 — 최저 후보 대비 +${(s.price_adult - minPrice).toLocaleString()}원`);

  // 4.9~4.10 DataConfidence·Freshness (conf = 0.5·min + 0.5·mean — 문서 05 §4.9)
  used.push({ conf: 0.3, at: s.data_checked_at, status: s.info_status }); // 회차 데이터 자체
  const confs = used.map((u) => u.conf);
  const dc = 0.5 * Math.min(...confs) + 0.5 * (confs.reduce((a, b) => a + b, 0) / confs.length);
  const freshes = used.map((u) => freshness(u.at, u.status === 'estimated' && u.at === s.data_checked_at ? 1 : 365));
  const fr = 0.5 * Math.min(...freshes) + 0.5 * (freshes.reduce((a, b) => a + b, 0) / freshes.length);

  // §5 최종 점수
  const quality = W.W1 * ffm + W.W2 * audQ + W.W3 * pm + W.W4 * seatQ;
  const personal = W.W5 * userPref + W.W6 * accFit;
  const logistics = W.W7 * conv + W.W8 * pv;
  let base = quality + personal + logistics;
  const isPremium = s.format !== 'standard';
  if (ffm < 0.4 && isPremium) base -= 0.5 * W.W2 * audQ; // 포맷 브랜드 가산점 금지 규칙
  const trust = 0.6 + 0.4 * (0.7 * dc + 0.3 * fr);
  const gate = 0.9; // 예매 가능 여부 미확인 (문서 05 §5)
  unc.push('잔여 좌석·매진 여부 미확인(게이트 0.9 적용)');
  const final = base * trust * gate;
  const confLabel = dc * fr >= 0.55 ? '높음' : dc * fr >= 0.3 ? '보통' : '낮음';

  return { s, t, axes: { ffm, audQ, pm, conv, pv, dc, fr }, quality, logistics, base, trust, final, confLabel, pos, neg, unc };
}

const scored = candidates.map(score).sort((a, b) => b.final - a.final);

// ── §6 다양성 선택: 균형 / 품질 / 근접·가성비 ────────────────────────
const picks = [];
const take = (label, arr) => {
  const p = arr.find((x) => !picks.some((q) => q.r.s.id === x.s.id));
  if (p) picks.push({ label, r: p });
};
take('균형', scored);
take('품질', [...scored].sort((a, b) => b.quality - a.quality));
take('근접·가성비', [...scored].sort((a, b) => b.logistics - a.logistics));

// ── 출력 ─────────────────────────────────────────────────────────────
const fmtName = { imax: 'IMAX', dolby_cinema: '돌비시네마', '4dx': '4DX', superplex: '수퍼플렉스', standard: '일반' };
const hhmm = (iso) => new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Seoul' });
console.log(`🎬 ${movie.title} (${movie.runtime_min}분, ${movie.director}) — ${req.date} 후보 ${shows.length}회차, 하드필터 통과 ${candidates.length}`);
console.log(`   조건: 출발(${req.origin.join(',')}) · 이동≤${req.maxTravelMinutes}분 · 우선순위 ${req.priority}\n`);
for (const { s, why } of excluded) console.log(`   [제외] ${s.loc_name} ${s.auditorium_no} ${hhmm(s.starts_at)} — ${why}`);
if (excluded.length) console.log('');

picks.forEach(({ label, r }, i) => {
  const { s } = r;
  console.log(`${i + 1}순위 [${label}] ${s.chain} ${s.loc_name.replace(s.chain, '').trim()} ${s.auditorium_no} ${hhmm(s.starts_at)} (${fmtName[s.format]}) — ${s.price_adult.toLocaleString()}원`);
  console.log(`   종합 ${r.final.toFixed(3)} = 기본 ${r.base.toFixed(3)} × 신뢰보정 ${r.trust.toFixed(2)} × 예매게이트 0.90`);
  console.log(`   축: 포맷적합 ${r.axes.ffm.toFixed(2)} · 관품질 ${r.axes.audQ.toFixed(2)} · 이동 ${r.t}분 · 신뢰도 ${r.axes.dc.toFixed(2)} · 최신성 ${r.axes.fr.toFixed(2)}`);
  for (const p of r.pos.slice(0, 3)) console.log(`   👍 ${p}`);
  for (const n of r.neg.slice(0, 2)) console.log(`   👎 ${n}`);
  for (const u of [...new Set(r.unc)].slice(0, 2)) console.log(`   ❓ ${u}`);
  console.log(`   확신도: ${r.confLabel} | 관 사양 확인일: ${s.spec_observed}(${s.spec_source ?? '?'}) | 회차 확인일: ${s.data_checked_at.slice(0, 10)}\n`);
});

// ── recommendation_runs 기록 ─────────────────────────────────────────
db.prepare(`INSERT INTO recommendation_runs (user_id, request, weights, results) VALUES (?,?,?,?)`).run(
  'demo-user', JSON.stringify(req), JSON.stringify(W),
  JSON.stringify(picks.map(({ label, r }) => ({ label, showtime_id: r.s.id, final: r.final, axes: r.axes }))),
);
console.log(`recommendation_runs 기록 완료 (총 ${db.prepare('SELECT COUNT(*) n FROM recommendation_runs').get().n}건)`);
db.close();
