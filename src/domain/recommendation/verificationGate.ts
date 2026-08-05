// R21.1 §3 — verified-only 추천 게이트. 사용자 추천에 포함할 회차 조건을 "코드로" 강제한다
// (운영 문서 의존 금지). 게이트에서 떨어진 후보는 stage='verification'으로 excluded에
// 편입돼 관리자 trace(/admin/runs)에서 사유를 확인할 수 있다.
//
// 포함 조건(비합성 회차):
//   status='active'(조회 계층에서 이미 필터) · verification_status='verified' ·
//   만료 전(expires_at ?? starts_at > now) · source_url 유효 · stale(확인 7일) 이내
// 합성 회차: 프로덕션에서는 절대 불가. 개발·데모·E2E에서만, 그것도 verified 후보가
// 하나도 없을 때의 폴백으로만 쓰인다.
import { isStale, STALE_AFTER_DAYS } from '../../lib/dataFreshness';
import { validateSourceUrl } from '../../lib/sourceUrlValidation';
import type { CandidateShowtime, ExcludedCandidate } from './types';

/** 합성 회차 사용 가능 여부 — 프로덕션(CINEFIT_ENV=production)은 env 값과 무관하게 금지. */
export function syntheticAllowed(env: Record<string, string | undefined> = process.env): boolean {
  if (env.CINEFIT_ENV === 'production') return false;
  return env.CINEFIT_ALLOW_SYNTHETIC !== 'false';
}

export interface GateResult {
  /** 추천 엔진에 넘길 후보 */
  eligible: CandidateShowtime[];
  /** 게이트에서 제외된 후보(stage='verification') — trace·화면 제외 목록에 편입 */
  gated: ExcludedCandidate[];
}

export function gateCandidates(
  all: CandidateShowtime[],
  opts: { now: Date; allowSynthetic: boolean },
): GateResult {
  const gated: ExcludedCandidate[] = [];
  const verifiedEligible: CandidateShowtime[] = [];
  const synthetic: CandidateShowtime[] = [];
  const nowMs = opts.now.getTime();

  for (const c of all) {
    if (c.isSynthetic) {
      synthetic.push(c);
      continue;
    }
    const reject = (reason: string) => gated.push({ candidate: c, reason, stage: 'verification' });
    if (c.verificationStatus !== 'verified') {
      reject(`검증 상태 '${c.verificationStatus}' — verified 회차만 추천에 포함`);
      continue;
    }
    const expiry = c.expiresAt ?? c.startsAt;
    if (new Date(expiry).getTime() <= nowMs) {
      reject('만료된 회차 — 만료(또는 시작) 시각 경과');
      continue;
    }
    const src = validateSourceUrl(c.sourceUrl, { fieldLabel: 'source_url' });
    if (!src.ok) {
      reject(`source URL 무효 — ${src.error}`);
      continue;
    }
    if (isStale(c.verifiedAt ?? c.dataCheckedAt, opts.now)) {
      reject(`마지막 확인 ${STALE_AFTER_DAYS}일 초과(stale) — 공식 페이지 재확인 후 갱신 필요`);
      continue;
    }
    verifiedEligible.push(c);
  }

  // 합성: verified 후보가 하나라도 있으면(또는 합성 비허용이면) 전부 게이트.
  if (verifiedEligible.length > 0 || !opts.allowSynthetic) {
    for (const c of synthetic) {
      gated.push({ candidate: c, reason: '검증용 합성 회차 — 사용자 추천 제외', stage: 'verification' });
    }
    return { eligible: verifiedEligible, gated };
  }
  // 개발·데모 폴백 — verified가 전무할 때만 합성으로 파이프라인을 검증한다.
  return { eligible: synthetic, gated };
}
