# 데이터 보존 정책 (초안)

- 기준일: 2026-07-28 (7차 마일스톤)
- **이 문서는 초안이다.** 실제 사용자가 생기기 전에 법률 검토 없이 임의로 확정하지 않았다 —
  아래는 "지금 코드가 실제로 무엇을 하는가"를 정확히 적은 것이지, 확정된 보존 기간 정책이
  아니다. 실제 알파 시작 전 사람이 검토·확정해야 한다(`docs/ALPHA-PLAN.md`).

## 지금 실제로 저장되는 것

| 테이블 | 성격 | 개인 식별 가능성 |
|---|---|---|
| `analytics_sessions`/`analytics_events` | append-only, 무기한 | 없음(회전 가능 익명 id, IP/GPS 없음) |
| `recommendation_runs`/`_feedback`/`_selections` | append-only, 무기한 | 없음(익명 세션 id만) |
| `post_watch_surveys`/`alpha_surveys` | append-only, 무기한 | 없음 |
| `booking_link_checks` | append-only, 무기한 | 해당 없음(URL·HTTP 상태만) |
| `audit_logs` | append-only, 무기한 | actor 문자열('admin' 등 — 실명 아님) |
| `issue_reports` | 수정 가능(상태 전이) | **`contact_email`은 선택 입력이며 개인 식별 가능** — 공개 화면에 절대 표시하지 않는다(`app/admin/reports` 등 관리자 전용 화면에만 노출) |
| `feature_flags` | 최신 상태만(이력은 `audit_logs`) | 없음 |

## 지금 없는 것 (알려진 gap)

- **자동 만료/삭제(TTL) 없음** — 위 append-only 테이블은 전부 무기한 보존된다. 실제
  사용자가 생기면 개인정보보호법·GDPR류 요구사항에 따라 보존 기간을 정하고 만료 배치를
  만들어야 한다(현재 `npm run maintenance:daily`는 회차 상태만 다루고 데이터를 지우지 않는다).
- **사용자 삭제/열람 요청 처리 절차 없음** — `issue_reports.contact_email`을 남긴 사용자가
  삭제를 요청할 창구가 코드/문서 어디에도 없다. 실제 알파 시작 전 만들어야 한다.
- **백업 정책 미수립** — SQLite/PostgreSQL 모두 백업 주기·보관 기간이 정해지지 않았다.

## 원칙 (계속 유지할 것)

- 분석 이벤트는 처음부터 익명으로 설계됐으므로(`docs/ANALYTICS.md`) "삭제 요청"이 원천적으로
  걸릴 일이 적다 — 이 설계를 앞으로도 유지한다(로그인·이메일 수집 확대 시 이 문서를 반드시
  다시 검토한다).
- `observations`처럼 불변으로 설계된 로그 테이블에 `UPDATE`를 추가하지 않는다(문서 06 §6).
