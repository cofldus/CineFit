// 보존 기간 정책 (초안) — docs/DATA-RETENTION.md와 짝을 이룬다. 순수 상수만 담아 DB 접근이
// 전혀 없다(src/data/retentionService.ts가 이 값을 읽어 실제 SQL을 만든다).
//
// 여기 적힌 일수는 법률 검토를 거친 확정값이 아니라, 이미 코드에 있던 다른 기준과 맞춘
// 잠정값이다 — 실제 알파 시작 전 사람이 재검토해야 한다(docs/ALPHA-PLAN.md).
export interface RetentionRule {
  /** DB 테이블명 — 전부 고정 리터럴이며 사용자 입력이 SQL에 섞이지 않는다 */
  table: string;
  dateColumn: string;
  days: number;
  note: string;
}

/** 나이 기준으로 일괄 삭제하는 테이블 — 전부 익명 세션 id만으로 연결된 로그성 데이터. */
export const AGE_PURGE_RULES: RetentionRule[] = [
  {
    table: 'analytics_events',
    dateColumn: 'created_at',
    days: 90,
    note: 'cinefit_session 쿠키 수명(90일, src/lib/analyticsSession.ts)과 일치',
  },
  {
    table: 'recommendation_feedback',
    dateColumn: 'created_at',
    days: 90,
    note: '세션 쿠키 수명과 일치',
  },
  {
    table: 'recommendation_selections',
    dateColumn: 'created_at',
    days: 90,
    note: '세션 쿠키 수명과 일치',
  },
  {
    table: 'post_watch_surveys',
    dateColumn: 'created_at',
    days: 90,
    note: '세션 쿠키 수명과 일치',
  },
  {
    table: 'alpha_surveys',
    dateColumn: 'created_at',
    days: 90,
    note: '세션 쿠키 수명과 일치',
  },
  {
    table: 'booking_link_checks',
    dateColumn: 'checked_at',
    days: 180,
    note: 'scripts/maintenance/markStaleData.ts의 180일(사양 최신성) 기준과 일치',
  },
];

/**
 * 위 나이 기준 삭제를 전부 거친 뒤에도 analytics_sessions 행 자체는 그대로 남는다(참조
 * 정합성 때문에 별도 취급) — last_seen_at이 이 일수보다 오래됐고, 위 테이블 어디에도 더 이상
 * 참조가 없는 세션만 정리 대상이다. invite_code_redemptions·alpha_consents는 동의 증빙
 * 성격이 강해 나이 기준으로는 지우지 않는다(그 세션이 이 정리 대상이 되려면 이 두 테이블에도
 * 참조가 없어야 한다) — 명시적 개인정보 삭제 요청(privacyRequestService)에서만 함께 지운다.
 */
export const ORPHAN_SESSION_AFTER_DAYS = 90;

/** 개인정보 삭제 요청(세션 유형) 시 지우는 테이블 — 나이 무관하게 해당 세션 전체를 지운다. */
export const SESSION_REQUEST_DELETE_TABLES = [
  'analytics_events',
  'recommendation_feedback',
  'recommendation_selections',
  'post_watch_surveys',
  'alpha_surveys',
  'invite_code_redemptions',
  'alpha_consents',
] as const;
