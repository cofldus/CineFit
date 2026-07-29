# 운영 가이드

- 기준일: 2026-07-28 (7차 마일스톤)
- 실제 배포·알파 시작 전 사람이 해야 할 일은 `docs/ALPHA-PLAN.md`를 따로 참고한다. 이
  문서는 "일단 배포가 됐다고 가정했을 때" 반복 운영 작업만 다룬다.

## 유지보수 CLI 실행 주기(권장)

| 명령 | 권장 주기 | 하는 일 | 네트워크 요청 |
|---|---|---|---|
| `npm run maintenance:daily` | 매일 1회 | 상영 종료 회차 자동 비활성화(`showtime_changes`에 이력) + 오래된 사양 리포트(보고만) | 없음 |
| `npm run maintenance:stale` | 필요할 때(대시보드 참고용) | 오래된(180일 초과) 사양 상영관 목록만 출력, 아무것도 바꾸지 않음 | 없음 |
| `npm run maintenance:links` | 주 1회 정도 | 활성·비확인(비합성) 회차의 예매 URL에 HEAD 요청, 상태(valid/redirected/expired/not_found/blocked/unknown) 기록 | 있음 — 공식 도메인만, 요청 사이 500ms 지연, 페이지 본문은 읽지 않음 |
| `npm run retention:preview` | 필요할 때(실행 전 확인용) | 보존 기간 초과 데이터가 몇 건인지만 보여줌, 아무것도 바꾸지 않음 | 없음 |
| `npm run retention:apply` | 주 1회 정도(아직 자동 스케줄 없음) | 나이 기준으로 초과 데이터 실제 삭제(`docs/DATA-DELETION.md`), `audit_logs`에 기록 | 없음 |

`maintenance:links`는 페이지 본문을 스크래핑하지 않고, CAPTCHA·로그인 우회를 시도하지
않으며, 과도한 요청을 보내지 않도록 설계됐다(`docs/DATA-QUALITY.md`, `src/domain/bookingLink/checker.ts`).
너무 자주 돌리면 극장 공식 사이트에 불필요한 부하를 줄 수 있으니 주 1회 이상 권장하지 않는다.

## 관리자 화면 지도

| 경로 | 용도 |
|---|---|
| `/admin` | 대시보드 — 회차·제보 요약 |
| `/admin/showtimes`, `/admin/showtimes/new` | 회차 등록·수정·비활성화(삭제 없음, 항상 이력 남김) |
| `/admin/reports` | 사용자 제보 검토·관찰 승인·좌석 존 승격(`docs/DATA-PROMOTION-POLICY.md`) |
| `/admin/quality` | 데이터 완성도·추천 품질 신호 대시보드(`docs/DATA-QUALITY.md`) |
| `/admin/booking-links` | 예매 링크 최신 검증 상태 |
| `/admin/feature-flags` | 기능 플래그 조회·생성·on/off (변경 이력은 `audit_logs`) |
| `/admin/invite-codes` | 비공개 알파 초대 코드 발급·비활성화(`docs/PRIVATE-ALPHA.md`) |
| `/admin/privacy-requests` | 개인정보 삭제 요청 검토·실행·반려(`docs/DATA-DELETION.md`) |
| `/admin/alpha-ops` | 초대·동의 현황 + 사용 퍼널 대시보드 (아래 "관측성·알파 운영 대시보드" 참고) |

전체 관리자 화면은 `ADMIN_PASSWORD` 환경변수가 설정돼 있어야 켜진다(`src/lib/adminAuth.ts`,
`adminEnabled()`) — 미설정 시 `/admin/*` 전체가 비활성 안내만 보여준다.

## 정책/플래그 변경 시 체크리스트

1. 추천 정책을 바꿀 때: `docs/RECOMMENDATION-EVALUATION.md`의 `npm run eval:recommendations`로
   골든셋 회귀부터 확인 → `ACTIVE_POLICY` 변경 → 변경 이유를 커밋 메시지에 남긴다.
2. 기능 플래그를 켤 때: 관련 기능이 실제로 준비됐는지 먼저 확인(예: `onboarding` 플래그는
   지금 기본으로 켜져 있다 — `db/seed-feature-flags.mjs`). `/admin/feature-flags`에서 켜고
   끈 이력은 `audit_logs`(`target_type='feature_flag'`)에서 조회할 수 있다.
3. 새 회차를 등록할 때: 반드시 공식 예매 페이지에서 확인 후 딥링크와 함께 등록한다
   (`docs/DEVELOPMENT.md` 운영 절차).

## 환경/시계 모드

- `CINEFIT_CLOCK_MODE=demo`면 시각이 고정값(데모/E2E 전용)으로 동작한다. 운영은 기본값
  `system`(실제 시스템 시간)을 쓴다(`src/lib/clock.ts`).
- `CINEFIT_ENV=production`이면 PostgreSQL이 강제된다 — SQLite는 개발·셀프호스트 단일
  노드 전용이다(`docs/BETA-LIMITATIONS.md`).

## 관측성·알파 운영 대시보드

- **구조화 로깅** (`src/lib/logger.ts`) — API 라우트의 에러 처리와 프로세스 종료(SIGTERM/
  SIGINT) 이벤트는 문자열을 이어붙인 `console.log`/`console.error` 대신 한 줄 JSON
  (`{level, event, time, ...}`)으로 남긴다. Vercel 등 배포 환경의 로그 수집기에서
  `event`·필드 기준으로 검색·집계할 수 있다. CLI 스크립트(`scripts/*.ts`)의 사람이 읽는
  터미널 출력은 대상이 아니다 — 그대로 `console.log`를 쓴다.
- **`/admin/alpha-ops`** — 원시 이벤트를 직접 SQL로 조회하지 않아도 되도록 다음을 한 화면에
  모은 대시보드(`src/data/alphaOpsRepository.ts`):
  - 초대 코드 발급·활성 수, 코드 사용(redemption) 총 건수·고유 세션 수
  - 전체 세션 대비 참여 동의(alpha_consents) 완료 비율
  - 사용 퍼널(앱 열림 → 영화 선택 → 추천 시작 → 추천 완료 → 피드백 제출) — 각 단계 고유
    세션 수와 "앱 열림" 대비 도달률(%)
  - 비공개 알파 게이트가 꺼져 있는 동안은 동의율이 낮게 나오는 게 정상이다 — 게이트를 켠
    뒤의 추이로만 판단한다.

## 알려진 운영 리스크

- SQLite + 리눅스 셀프호스트 조합에서 드문 쓰기-직후-읽기 지연 현상 미해결(`docs/TESTING.md` §4).
- 데이터 보존 자동 정리·삭제 요청 처리는 구현됐지만(`docs/DATA-DELETION.md`) 아직 cron 등
  자동 스케줄에 연결하지 않았다 — 사람이 주기적으로 `npm run retention:apply`를 실행하거나
  스케줄러에 등록해야 한다.
- ~~KMDb API 키는 발급받았으나 어댑터 코드는 아직 없다~~ → 2026-07-29 어댑터 구현 완료
  (`docs/KMDB-INTEGRATION.md`, `docs/IDENTIFIER-LINKAGE.md`). 아직 남은 것: KOBIS 상업적
  사용 범위 KOFIC 서면 확인(`docs/ALPHA-PLAN.md`).
