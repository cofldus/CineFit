// R21.1 §3 — verified-only 게이트: unverified/expired/synthetic/invalid-source/stale 회차가
// 사용자 추천에 절대 섞이지 않음을 코드로 검증한다(운영 문서 의존 금지).
import { describe, expect, it } from 'vitest';
import { gateCandidates, syntheticAllowed } from '../../src/domain/recommendation/verificationGate';
import { makeCandidate, NOW } from '../fixtures';

const OFFICIAL = 'https://ticket.cgv.co.kr/showtime/1';
const verifiedCandidate = (over: Parameters<typeof makeCandidate>[0] = {}) =>
  makeCandidate({
    isSynthetic: false,
    verificationStatus: 'verified',
    sourceUrl: OFFICIAL,
    verifiedAt: '2026-07-27T09:00:00+09:00',
    ...over,
  });

describe('gateCandidates — verified-only 강제', () => {
  it('조건을 모두 충족한 verified 회차만 eligible이 된다', () => {
    const good = verifiedCandidate();
    const { eligible, gated } = gateCandidates([good], { now: NOW, allowSynthetic: false });
    expect(eligible).toEqual([good]);
    expect(gated).toHaveLength(0);
  });

  it('unverified 회차는 제외되고 trace용 사유(stage=verification)가 남는다', () => {
    const { eligible, gated } = gateCandidates(
      [verifiedCandidate({ verificationStatus: 'unverified' })],
      { now: NOW, allowSynthetic: false },
    );
    expect(eligible).toHaveLength(0);
    expect(gated[0].stage).toBe('verification');
    expect(gated[0].reason).toContain('unverified');
  });

  it('만료된 회차(expires_at 또는 시작 시각 경과)는 제외된다', () => {
    const past = verifiedCandidate({ startsAt: '2026-07-26T19:00:00+09:00' }); // NOW(07-27 12:00) 이전
    const explicitExpiry = verifiedCandidate({ expiresAt: '2026-07-27T10:00:00+09:00' });
    const { eligible, gated } = gateCandidates([past, explicitExpiry], { now: NOW, allowSynthetic: false });
    expect(eligible).toHaveLength(0);
    expect(gated.every((g) => g.reason.includes('만료'))).toBe(true);
  });

  it('source URL이 없거나 placeholder면 제외된다', () => {
    const noUrl = verifiedCandidate({ sourceUrl: null });
    const placeholder = verifiedCandidate({ sourceUrl: 'https://example.invalid/REPLACE' });
    const { eligible, gated } = gateCandidates([noUrl, placeholder], { now: NOW, allowSynthetic: false });
    expect(eligible).toHaveLength(0);
    expect(gated).toHaveLength(2);
    expect(gated.every((g) => g.reason.includes('source URL 무효'))).toBe(true);
  });

  it('마지막 확인 7일 초과(stale) 회차는 제외된다', () => {
    const stale = verifiedCandidate({
      verifiedAt: '2026-07-10T09:00:00+09:00',
      startsAt: '2026-07-28T19:00:00+09:00',
    });
    const { eligible, gated } = gateCandidates([stale], { now: NOW, allowSynthetic: false });
    expect(eligible).toHaveLength(0);
    expect(gated[0].reason).toContain('stale');
  });

  it('합성 회차는 allowSynthetic=false(프로덕션)면 절대 포함되지 않는다', () => {
    const synthetic = makeCandidate({});
    const { eligible, gated } = gateCandidates([synthetic], { now: NOW, allowSynthetic: false });
    expect(eligible).toHaveLength(0);
    expect(gated[0].reason).toContain('합성');
  });

  it('verified 후보가 하나라도 있으면 합성은 개발 모드에서도 전부 게이트된다', () => {
    const good = verifiedCandidate();
    const synthetic = makeCandidate({});
    const { eligible, gated } = gateCandidates([good, synthetic], { now: NOW, allowSynthetic: true });
    expect(eligible).toEqual([good]);
    expect(gated.some((g) => g.reason.includes('합성'))).toBe(true);
  });

  it('개발 폴백 — verified가 전무할 때만 합성이 eligible이 된다', () => {
    const synthetic = makeCandidate({});
    const { eligible } = gateCandidates([synthetic], { now: NOW, allowSynthetic: true });
    expect(eligible).toEqual([synthetic]);
  });
});

describe('syntheticAllowed — 프로덕션 하드 차단', () => {
  it('CINEFIT_ENV=production이면 env 값과 무관하게 false다', () => {
    expect(syntheticAllowed({ CINEFIT_ENV: 'production' })).toBe(false);
    expect(syntheticAllowed({ CINEFIT_ENV: 'production', CINEFIT_ALLOW_SYNTHETIC: 'true' })).toBe(false);
  });

  it('개발 환경은 기본 허용, 명시적 false로 끌 수 있다', () => {
    expect(syntheticAllowed({})).toBe(true);
    expect(syntheticAllowed({ CINEFIT_ALLOW_SYNTHETIC: 'false' })).toBe(false);
  });
});
