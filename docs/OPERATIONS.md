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

## 알려진 운영 리스크

- SQLite + 리눅스 셀프호스트 조합에서 드문 쓰기-직후-읽기 지연 현상 미해결(`docs/TESTING.md` §4).
- 데이터 보존·삭제 요청 처리 절차 미비(`docs/DATA-RETENTION.md`).
- KMDb API 키는 발급받았으나(2026-07-28) 어댑터 코드는 아직 없다 — KOBIS 단일 출처로만
  운영 중(`docs/BETA-LIMITATIONS.md`).
