// 회차 데이터 신선도(R20 §1·§9) — "마지막 확인이 오래된" 데이터를 stale로 명시한다.
// 색이 아니라 문구·확인일로 상태를 전달하기 위한 공용 판정·표시 헬퍼.
import type { CandidateShowtime } from '../domain/recommendation/types';

/** 관리자 확인 후 이 일수가 지나면 stale — 상영 스케줄은 주 단위로 바뀐다. */
export const STALE_AFTER_DAYS = 7;

export function isStale(checkedAt: string | null, now: Date): boolean {
  if (!checkedAt) return true;
  const t = new Date(checkedAt).getTime();
  if (!Number.isFinite(t)) return true;
  return now.getTime() - t > STALE_AFTER_DAYS * 86_400_000;
}

/** 후보 목록의 대표 확인 시각 — 가장 최근의 verifiedAt(없으면 dataCheckedAt). */
export function latestCheckedAt(candidates: Pick<CandidateShowtime, 'verifiedAt' | 'dataCheckedAt'>[]): string | null {
  const times = candidates
    .map((c) => c.verifiedAt ?? c.dataCheckedAt)
    .filter((t): t is string => Boolean(t))
    .sort();
  return times.length > 0 ? times[times.length - 1] : null;
}

const checkedFmt = new Intl.DateTimeFormat('ko-KR', {
  month: 'long',
  day: 'numeric',
  timeZone: 'Asia/Seoul',
});

export function formatCheckedAt(checkedAt: string): string {
  return checkedFmt.format(new Date(checkedAt));
}

/** 후보 계산 결과의 데이터 연결 상태 — preview API·화면 상태 머신이 공유한다. */
export type CandidateDataState = 'verified' | 'synthetic' | 'none';

export function deriveCandidateDataState(input: { total: number; usedSynthetic: boolean }): CandidateDataState {
  if (input.total === 0) return 'none';
  return input.usedSynthetic ? 'synthetic' : 'verified';
}
