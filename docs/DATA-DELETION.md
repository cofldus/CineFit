# 보존 기간 자동 정리 + 삭제 요청 처리

- 기준일: 2026-07-29 (8차 마일스톤)
- `docs/DATA-RETENTION.md`(무엇을 얼마나 보존하는지)·`docs/PRIVACY-BETA.md`(무엇을
  수집하는지)가 gap으로 남겨둔 두 가지 — 자동 만료(TTL)와 사용자 삭제 요청 창구 — 를
  구현한다.

## 두 가지 삭제 경로

| | 나이 기준 자동 정리(retention) | 삭제 요청(privacy request) |
|---|---|---|
| 트리거 | 사람이 CLI 실행(`npm run retention:apply`) | 이용자가 `/privacy`에서 요청 → 관리자가 승인 |
| 대상 | 오래된 데이터 전체(익명, 특정 개인 지목 아님) | 요청자가 지목한 세션 하나 또는 이메일 하나 |
| 목적 | 무기한 보존을 막는 일반 위생 관리 | 개인의 명시적 삭제 요청에 대응 |

둘 다 `src/data/sessionDataDeletion.ts`의 같은 테이블 목록·순서를 공유한다(자식 테이블 →
`recommendation_runs` 링크 해제 → `analytics_sessions` 행) — PostgreSQL은 FK를 실제로
강제하므로 순서를 지키지 않으면 실패한다.

## 나이 기준 자동 정리 (`src/domain/retention/policy.ts`, `src/data/retentionService.ts`)

| 테이블 | 기준 컬럼 | 보존 일수 | 근거 |
|---|---|---|---|
| `analytics_events` | `created_at` | 90 | `cinefit_session` 쿠키 수명과 일치 |
| `recommendation_feedback` | `created_at` | 90 | 위와 동일 |
| `recommendation_selections` | `created_at` | 90 | 위와 동일 |
| `post_watch_surveys` | `created_at` | 90 | 위와 동일 |
| `alpha_surveys` | `created_at` | 90 | 위와 동일 |
| `booking_link_checks` | `checked_at` | 180 | `scripts/maintenance/markStaleData.ts`의 180일 기준과 일치 |

**이 일수는 법률 검토를 거친 확정값이 아니라 잠정값이다** — 이미 코드에 있던 다른 기준
(세션 쿠키 수명, 사양 최신성 기준)과 맞춘 것뿐이다. 실제 알파 시작 전 재검토해야 한다.

`analytics_sessions` 자체는 나이만으로 지우지 않는다 — `last_seen_at`이 오래됐고, 위 표의
모든 테이블은 물론 `invite_code_redemptions`·`alpha_consents`에도 더 이상 참조가 없는
세션만 정리한다(둘 다 "동의했다는 증빙" 성격이 강해 나이 기준으로는 일부러 지우지 않는다).
정리 대상이면 `recommendation_runs.session_id`를 먼저 NULL로 바꿔 링크를 끊은 뒤(실행
기록 자체는 남긴다) 세션 행을 지운다.

`recommendation_runs`·`audit_logs`는 나이 기준 정리 대상이 아니다 — 전자는 세션 연결이
끊긴 뒤에도 평가·이력 가치가 있고, 후자는 그 자체가 감사 기록이라 지우면 안 된다.

```bash
npm run retention:preview   # 실제로 지우지 않고 몇 건이나 지워질지만 보여준다
npm run retention:apply     # 실제로 지운다 — audit_logs에 retention_apply 이벤트 한 건 남김
```

아직 cron 등 자동 스케줄에 연결하지 않았다 — 사람이 주기적으로 실행하거나 스케줄러
(예: GitHub Actions scheduled workflow)에 등록해야 한다.

## 삭제 요청 (`src/data/privacyRequestService.ts`, `/privacy`, `/admin/privacy-requests`)

### 세션 유형

CineFit은 로그인이 없어 "본인 확인"을 별도로 할 수 없다 — 대신 **지금 사용 중인 브라우저의
세션 쿠키 자체가 본인 확인 수단**이다. `/privacy`의 첫 번째 폼은 서버가
`readAnalyticsSessionId(req)`로 요청자의 실제 쿠키 값을 읽어 그 세션 하나만 요청 대상으로
등록한다 — 요청자가 임의의 세션 id를 입력할 수 있는 필드는 애초에 없다.

관리자가 승인하면 `deleteSessionData()`(`src/data/sessionDataDeletion.ts`)가 그 세션에
딸린 `analytics_events`·`recommendation_feedback`·`recommendation_selections`·
`post_watch_surveys`·`alpha_surveys`·`invite_code_redemptions`·`alpha_consents`를 전부
지우고, `recommendation_runs.session_id`를 NULL로 바꾼 뒤, `analytics_sessions` 행 자체를
지운다.

### 이메일 유형

상영관 정보 제보 폼(`ReportForm`)에 남긴 연락 이메일(`issue_reports.contact_email`)은
세션과 무관하게 별도로 존재한다. `/privacy`의 두 번째 폼은 이메일 주소를 직접 입력받아
요청을 등록한다 — 본인 확인 수단이 없으므로 **제보 내용 자체는 지우지 않고 이메일
필드만 NULL로 바꾼다**(제보가 담고 있는 상영관 사양·좌석 정보는 개인정보가 아니라 그대로
남겨도 안전하고, 관리자 검토 이력에서 근거를 잃지 않는다). 남용 소지가 이메일 필드
하나를 지우는 것으로 제한되므로, 이메일 소유권을 검증하지 않아도 위험이 낮다고 판단했다.

### 왜 즉시 자동 실행하지 않는가

두 유형 모두 요청 즉시 실행하지 않고 `privacy_deletion_requests`에 `pending`으로 쌓아
`/admin/privacy-requests`에서 관리자가 검토 후 승인·반려한다. 이유:

1. **감사 로그** — 실행 시점에 `audit_logs`에 `privacy_request_completed`/
   `privacy_request_rejected` 이벤트가 남는다.
2. **오남용 방지** — 세션 id 오타, 존재하지 않는 이메일 등 잘못된 요청을 실행 전에
   걸러낼 여지를 둔다.
3. 요청 제출 자체는 세션 해시 기준 시간당 3건으로 제한한다(`issue_reports`의 남용 방지
   패턴과 동일 — `src/lib/sessionHash.ts`).

### 관리자 화면

`/admin/privacy-requests` — 상태별 필터(대기/완료/반려) + 목록. 상세 화면
(`/admin/privacy-requests/[id]`)은 실행 전 "삭제 시 영향받을 데이터" 미리보기(세션 유형은
테이블별 건수, 이메일 유형은 일치하는 제보 목록)를 보여준 뒤 삭제 실행·반려 버튼을 제공한다.
