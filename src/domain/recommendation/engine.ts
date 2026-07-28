// 추천 엔진 — 문서 05 파이프라인의 순수 함수 구현 (DB·UI 비의존, now 주입으로 결정적)
// 하드 필터 → 축 점수 → 신뢰도·최신성 보정 → 브랜드 가산 차단 → 다양성 선택 → 설명 생성
import { estimateTravelMinutes } from '../../lib/geo';
import { FORMAT_LABELS, INFO_STATUS_LABELS, VERIFIED_STATUSES, WEIGHT_PRESETS } from './presets';
import { desiredPurposes, matchZones, suggestSeatZone } from './seatZone';
import type {
  CandidateShowtime,
  Citation,
  ExcludedCandidate,
  MovieWithSpecs,
  PickLabel,
  RecommendationRequest,
  RecommendationResult,
  ScoredCandidate,
  SpecValue,
} from './types';

export interface EngineInput {
  movie: MovieWithSpecs;
  candidates: CandidateShowtime[];
  request: RecommendationRequest;
  now: Date; // 최신성 계산 기준 시각 (주입 — 테스트 결정성)
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

const freshness = (dateStr: string, halfLifeDays: number, now: Date): number => {
  const days = Math.max(0, (now.getTime() - new Date(dateStr).getTime()) / 86_400_000);
  return Math.exp((-Math.LN2 * days) / halfLifeDays); // 문서 05 §4.10
};

// ── 하드 필터 (문서 05 §3 — 점수 상쇄 절대 금지) ──────────────────────
export function hardFilter(
  candidates: CandidateShowtime[],
  request: RecommendationRequest,
): { passed: CandidateShowtime[]; excluded: ExcludedCandidate[] } {
  const excluded: ExcludedCandidate[] = [];
  const passed = candidates.filter((c) => {
    const reject = (reason: string) => {
      excluded.push({ candidate: c, reason });
      return false;
    };
    if (c.location.status !== 'operating' || c.auditorium.status !== 'operating')
      return reject('운영 상태 미확정·중단 상영관');
    const allowed =
      (c.format === 'imax' && request.allowImax) ||
      (c.format === 'dolby_cinema' && request.allowDolby) ||
      ((c.format === 'standard' || c.format === 'superplex') && request.allowStandard) ||
      c.format === '4dx'; // 4DX는 멀미 민감도로만 제어 (아래)
    if (!allowed) return reject(`${FORMAT_LABELS[c.format]} — 허용하지 않은 포맷`);
    if (request.motionSickness === 2 && c.format === '4dx')
      return reject('멀미 민감(높음) — 4DX 제외');
    const travel = estimateTravelMinutes(request.origin, c.location);
    if (travel > request.maxTravelMinutes)
      return reject(`이동 약 ${travel}분 — 최대 이동 시간 ${request.maxTravelMinutes}분 초과`);
    if (c.priceAdult > request.maxPrice)
      return reject(`가격 ${c.priceAdult.toLocaleString('ko-KR')}원 — 상한 ${request.maxPrice.toLocaleString('ko-KR')}원 초과`);
    if (request.wheelchair)
      return reject('휠체어 접근 정보 미확인 — 확인된 상영관만 추천 가능 (점수 보상 없이 제외)');
    return true;
  });
  return { passed, excluded };
}

// ── 후보 점수화 ───────────────────────────────────────────────────────
export function scoreCandidate(
  movie: MovieWithSpecs,
  c: CandidateShowtime,
  request: RecommendationRequest,
  now: Date,
  minPriceAmongCandidates: number,
): ScoredCandidate {
  const W = WEIGHT_PRESETS[request.priority];
  const spec = movie.specs;
  const aud = c.auditorium.spec;
  const proj = aud?.projector ?? {};
  const screen = aud?.screen ?? {};
  const sound = aud?.sound ?? {};

  const pros: string[] = [];
  const cons: string[] = [];
  const uncertainties: string[] = [];
  const citations: Citation[] = [];
  const used: { conf: number; at: string; halfLife: number }[] = [];

  const cite = (what: string, s: SpecValue) => {
    citations.push({
      what,
      sourceName: s.sourceName ?? '출처 없음',
      sourceUrl: s.sourceUrl,
      observedAt: s.observedAt,
      infoStatus: s.infoStatus,
    });
    used.push({ conf: s.confidence, at: s.observedAt, halfLife: 365 });
    return s;
  };

  // 4.1 FilmFormatMatch — 포맷 브랜드가 아니라 영화가 그 포맷의 장점을 실제로 쓰는가
  let ffm = 0;
  if (c.format === 'imax') {
    const ar = spec.imax_expanded_ar && cite('IMAX 확장 화면비', spec.imax_expanded_ar);
    if (ar && VERIFIED_STATUSES.has(ar.infoStatus)) {
      ffm += 0.35;
      pros.push(`${ar.value}:1 확장 화면비 확인 (${ar.sourceName ?? '출처 없음'})`);
    } else if (ar) {
      ffm += 0.1;
      uncertainties.push(
        `IMAX 확장 화면비 미검증(${INFO_STATUS_LABELS[ar.infoStatus] ?? ar.infoStatus}) — 확인되면 순위가 바뀔 수 있음`,
      );
    } else {
      uncertainties.push('IMAX 확장 화면비 정보 없음');
    }
    if (spec.filmed_for_imax?.value) {
      cite('IMAX 인증 카메라', spec.filmed_for_imax);
      ffm += 0.15;
      pros.push('IMAX 인증 카메라 촬영');
    }
    if (ar && aud?.supportedAr) {
      if (Number(aud.supportedAr) <= Number(ar.value)) {
        ffm += 0.2;
        pros.push(`이 관은 확장비 ${ar.value}:1을 실제 표시 가능 (지원 ${aud.supportedAr}:1)`);
      } else {
        cons.push(`영화 확장비 ${ar.value}:1인데 관 지원은 ${aud.supportedAr}:1 — 풀사이즈 상영 불가`);
      }
    }
    const im = spec.imax_sound_mix && cite('IMAX 사운드 믹스', spec.imax_sound_mix);
    if (im?.value && VERIFIED_STATUSES.has(im.infoStatus)) {
      ffm += 0.15;
      pros.push('IMAX 사운드 믹스 확인');
    } else if (im?.value) {
      ffm += 0.05;
      uncertainties.push(`IMAX 사운드 믹스 미검증(${INFO_STATUS_LABELS[im.infoStatus] ?? im.infoStatus})`);
    }
    if (spec.genre_spectacle?.value) {
      cite('시각 스펙터클 장르 가중', spec.genre_spectacle);
      ffm += 0.15;
    }
  } else if (c.format === 'dolby_cinema') {
    ffm += 0.2;
    if (spec.dolby_vision?.value) {
      cite('돌비 비전 마스터', spec.dolby_vision);
      ffm += 0.3;
      pros.push('돌비 비전 마스터 확인');
    }
    const at = spec.atmos_mix && cite('애트모스 믹스', spec.atmos_mix);
    if (at?.value) {
      ffm += 0.25;
      pros.push('애트모스 믹스 확인');
    } else if (at && at.value === false) {
      cons.push('애트모스 믹스 없음(5.1) — 돌비관 사운드 이점 제한');
    }
    const dark = spec.dark_scene_ratio && cite('어두운 장면 비중', spec.dark_scene_ratio);
    if (dark) ffm += clamp01(Number(dark.value)) * 0.25;
  } else if (c.format === '4dx') {
    const spectacle = spec.genre_spectacle && cite('시각 스펙터클 장르', spec.genre_spectacle);
    ffm = spectacle?.value ? 0.6 : 0.25;
    if (!spectacle?.value) cons.push('대사 중심 작품 — 4DX 효과 궁합 낮음');
    uncertainties.push('4DX 효과-서사 궁합은 추정');
  } else {
    // superplex·standard — 일반 대형관 경로 (문서 05 §4.1 마지막 규칙)
    ffm = 0.35;
    const nat = spec.native_ar && cite('기본 화면비', spec.native_ar);
    if (nat && screen.aspect && Math.abs(Number(nat.value) - Number(screen.aspect)) < 0.2) {
      ffm += 0.15;
      pros.push(`영화 화면비 ${nat.value}:1과 스크린 비율 일치`);
    } else if (nat && screen.aspect) {
      cons.push(`영화 ${nat.value}:1 × 스크린 ${screen.aspect}:1 — 화면 여백 발생`);
    }
    if ((screen.widthM ?? 0) >= 30) {
      ffm += 0.2;
      pros.push(`초대형 스크린 (폭 ${screen.widthM}m)`);
    }
    if (spec.atmos_mix?.value && sound.format === 'atmos') {
      cite('애트모스 믹스', spec.atmos_mix);
      ffm += 0.1;
      pros.push('애트모스 믹스 × 애트모스관');
    }
  }
  ffm = clamp01(ffm);

  // 4.2 AuditoriumQuality — 결측은 중립 0.5 + DataConfidence 감점 (문서 05 §4.2)
  const szScore = screen.widthM ? clamp01(screen.widthM / 32) : 0.5;
  if (!screen.widthM) uncertainties.push('스크린 실측 크기 미확인');
  const pjScore =
    proj.lightSource === 'laser' ? (proj.resolution === '4k' ? (proj.dual ? 1 : 0.9) : 0.75) : 0.5;
  const sdScore =
    ({ imax_12ch: 1, atmos: 0.95, '7.1': 0.7, '5.1': 0.6 } as Record<string, number>)[sound.format ?? ''] ?? 0.5;
  const mkScore =
    ({ both: 1, side: 0.85, top: 0.85, none: 0.6, unknown: 0.5 } as Record<string, number>)[aud?.masking ?? 'unknown'] ?? 0.5;
  const audQ = clamp01(0.3 * szScore + 0.3 * pjScore + 0.25 * sdScore + 0.15 * mkScore);
  if (aud) {
    citations.push({
      what: '상영관 사양',
      sourceName: aud.sourceName ?? '출처 없음',
      sourceUrl: aud.sourceUrl,
      observedAt: aud.observedAt,
      infoStatus: aud.infoStatus,
    });
    used.push({ conf: aud.confidence, at: aud.observedAt, halfLife: 365 });
  } else {
    used.push({ conf: 0.3, at: c.dataCheckedAt, halfLife: 365 });
    uncertainties.push('상영관 사양 정보 없음 — 중립값으로 계산');
  }

  // 4.3 PresentationMatch — 배급 버전 중 이 회차 포맷의 상대 적합도
  const best = spec.imax_expanded_ar ? 'imax' : spec.dolby_vision?.value ? 'dolby_cinema' : 'standard';
  const pm = c.format === best ? 1 : c.format === 'standard' ? 0.6 : 0.75;

  // 4.4 SeatQuality — 좌석 존(목적별 구역) 기반 근사. 잔여석 미수집 전제 (문서 05 §4.4)
  const zones = c.auditorium.seatZones;
  const desired = desiredPurposes(c.format, request);
  let seatQ = 0.5;
  if (zones.length) {
    const matched = matchZones(zones, desired);
    const covered = desired.filter((p) => matched.some((z) => z.purposes.includes(p)));
    if (matched.length) {
      const avgConf = matched.reduce((a, z) => a + z.confidence, 0) / matched.length;
      seatQ = clamp01(0.5 + 0.35 * (covered.length / desired.length) * avgConf);
      const best = matched[0];
      citations.push({
        what: `좌석 존 (${best.purposes.join('·')})`,
        sourceName: best.sourceName ?? '출처 없음',
        sourceUrl: null,
        observedAt: best.observedAt,
        infoStatus: best.infoStatus,
      });
      used.push({ conf: best.confidence, at: best.observedAt, halfLife: 90 }); // 좌석 제보 반감기 90일 (문서 05 §4.10)
    }
    uncertainties.push('좌석 존은 제보·추정 기반 — 실제 잔여 좌석 미반영');
  } else {
    uncertainties.push('좌석 존 데이터 없음 — 좌석 점수는 중립값');
  }
  // 4.5~4.6 — 스파이크 범위 밖은 중립 0.5
  const userPref = 0.5;
  const accFit = 0.5;

  // 4.7 Convenience
  const travelMinutes = estimateTravelMinutes(request.origin, c.location);
  const conv = clamp01(1 - travelMinutes / 90);
  (travelMinutes <= 30 ? pros : cons).push(
    `이동 약 ${travelMinutes}분 (${c.location.transitNote ?? '경로 정보 없음'}) — 직선거리 근사 추정`,
  );

  // 4.8 PriceValue
  const pv = clamp01(((ffm * 0.6 + audQ * 0.4) * 15_000) / c.priceAdult);
  if (c.priceAdult - minPriceAmongCandidates >= 5_000)
    cons.push(
      `가격 ${c.priceAdult.toLocaleString('ko-KR')}원 — 최저 후보 대비 +${(c.priceAdult - minPriceAmongCandidates).toLocaleString('ko-KR')}원`,
    );

  // 4.9 DataConfidence — conf = 0.5·min + 0.5·mean (문서 05 §4.9)
  used.push({ conf: 0.3, at: c.dataCheckedAt, halfLife: 1 }); // 회차 데이터 자체 (합성 시드 = estimated)
  const confs = used.map((u) => u.conf);
  const dc = 0.5 * Math.min(...confs) + 0.5 * (confs.reduce((a, b) => a + b, 0) / confs.length);

  // 4.10 Freshness — 반감기: 회차 1일 / 관 사양 365일
  const freshes = used.map((u) => freshness(u.at, u.halfLife, now));
  const fr = 0.5 * Math.min(...freshes) + 0.5 * (freshes.reduce((a, b) => a + b, 0) / freshes.length);

  // §5 최종 점수
  const quality = W.W1 * ffm + W.W2 * audQ + W.W3 * pm + W.W4 * seatQ;
  const personal = W.W5 * userPref + W.W6 * accFit;
  const logistics = W.W7 * conv + W.W8 * pv;
  let base = quality + personal + logistics;
  const isPremium = c.format !== 'standard';
  if (ffm < 0.4 && isPremium) base -= 0.5 * W.W2 * audQ; // 포맷 브랜드 가산점 금지 규칙
  const trust = 0.6 + 0.4 * (0.7 * dc + 0.3 * fr);
  const availabilityGate = 0.9; // 잔여 좌석·매진 미확인 (문서 05 §5)
  uncertainties.push('잔여 좌석·매진 여부 미확인 — 예매 게이트 0.9 적용');
  const final = base * trust * availabilityGate;
  const confidenceLabel = dc * fr >= 0.55 ? '높음' : dc * fr >= 0.3 ? '보통' : '낮음';

  return {
    candidate: c,
    travelMinutes,
    axes: { ffm, audQ, pm, seatQ, conv, pv, dc, fr },
    quality,
    logistics,
    base,
    trust,
    final,
    confidenceLabel,
    pros,
    cons,
    uncertainties: [...new Set(uncertainties)],
    seatZone: suggestSeatZone(c.format, aud, request, zones),
    citations,
  };
}

// ── §6 다양성 선택: 균형 / 품질 / 근접·가성비 ─────────────────────────
export function selectDiverse(scored: ScoredCandidate[]): { label: PickLabel; scored: ScoredCandidate }[] {
  const picks: { label: PickLabel; scored: ScoredCandidate }[] = [];
  const take = (label: PickLabel, ordered: ScoredCandidate[]) => {
    const found = ordered.find((s) => !picks.some((p) => p.scored.candidate.showtimeId === s.candidate.showtimeId));
    if (found) picks.push({ label, scored: found });
  };
  take('균형', scored);
  take('품질', [...scored].sort((a, b) => b.quality - a.quality));
  take('근접·가성비', [...scored].sort((a, b) => b.logistics - a.logistics));
  return picks;
}

export function recommend(input: EngineInput): RecommendationResult {
  const { movie, candidates, request, now } = input;

  // 배급 버전에 없는 포맷 회차 제거 (문서 05 §4.1 — 4DX 버전 미확인이면 후보 아님)
  // 수퍼플렉스 등 대형 일반관 상영은 표준(2D) 배급 버전을 사용한다.
  const versions = (movie.specs.format_versions?.value as string[] | undefined) ?? [];
  const requiredVersion = (format: string) => (format === 'superplex' ? 'standard' : format);
  const versionExcluded: ExcludedCandidate[] = [];
  const inVersion = candidates.filter((c) => {
    if (versions.includes(requiredVersion(c.format))) return true;
    versionExcluded.push({ candidate: c, reason: `${FORMAT_LABELS[c.format]} 버전 배급 미확인` });
    return false;
  });

  const { passed, excluded } = hardFilter(inVersion, request);
  const minPrice = passed.length ? Math.min(...passed.map((c) => c.priceAdult)) : 0;
  const scored = passed
    .map((c) => scoreCandidate(movie, c, request, now, minPrice))
    .sort((a, b) => b.final - a.final);

  return {
    movie,
    request,
    weights: WEIGHT_PRESETS[request.priority],
    totalCandidates: candidates.length,
    excluded: [...versionExcluded, ...excluded],
    picks: selectDiverse(scored),
    scored,
  };
}
