// 애플리케이션 시계 — 운영(system)·데모(demo, 고정 시각)·테스트(fixedClock 주입) 분리.
// 시간대는 Asia/Seoul을 명시적으로 처리한다. new Date() 직접 호출 대신 이 모듈을 사용할 것.
export interface Clock {
  now(): Date;
}

/** 합성 시드(2026-07-28 회차)와 정합되는 데모 기준 시각 */
export const DEFAULT_DEMO_NOW_ISO = '2026-07-27T12:00:00+09:00';

export function systemClock(): Clock {
  return { now: () => new Date() };
}

export function fixedClock(iso: string): Clock {
  const fixed = new Date(iso);
  if (Number.isNaN(fixed.getTime())) throw new Error(`잘못된 시각 형식: ${iso}`);
  return { now: () => fixed };
}

/**
 * 환경변수 기반 앱 시계.
 * - CINEFIT_CLOCK_MODE=system(기본): 실제 시스템 시간
 * - CINEFIT_CLOCK_MODE=demo: CINEFIT_DEMO_NOW(없으면 기본 데모 시각) 고정
 */
export function getAppClock(): Clock {
  const mode = process.env.CINEFIT_CLOCK_MODE ?? 'system';
  if (mode === 'demo') return fixedClock(process.env.CINEFIT_DEMO_NOW || DEFAULT_DEMO_NOW_ISO);
  return systemClock();
}

const seoulDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' });
const seoulTime = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'Asia/Seoul',
});

/** Asia/Seoul 기준 YYYY-MM-DD — 자정 경계(UTC 15:00)에 유의 */
export function seoulDateString(d: Date): string {
  return seoulDate.format(d);
}

export function seoulTimeString(d: Date): string {
  return seoulTime.format(d);
}

/** 서울 기준 하루(YYYY-MM-DD)의 UTC ISO 범위 [start, end) — DB 방언 독립 날짜 필터용 */
export function seoulDayUtcRange(date: string): { start: string; end: string } {
  const start = new Date(`${date}T00:00:00+09:00`);
  if (Number.isNaN(start.getTime())) throw new Error(`잘못된 날짜: ${date}`);
  return { start: start.toISOString(), end: new Date(start.getTime() + 86_400_000).toISOString() };
}
