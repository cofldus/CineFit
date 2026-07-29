# 데이터 보존 정책 (초안)

- 기준일: 2026-07-29 (8차 마일스톤, 최초 작성 2026-07-28 7차 마일스톤)
- **이 문서는 초안이다.** 실제 사용자가 생기기 전에 법률 검토 없이 임의로 확정하지 않았다 —
  아래는 "지금 코드가 실제로 무엇을 하는가"를 정확히 적은 것이지, 확정된 보존 기간 정책이
  아니다. 실제 알파 시작 전 사람이 검토·확정해야 한다(`docs/ALPHA-PLAN.md`).
- 8차 마일스톤에서 아래 "지금 없는 것" 중 자동 만료(TTL)와 삭제 요청 처리 절차를 실제로
  구현했다 — 자세한 내용은 `docs/DATA-DELETION.md` 참고.

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

- ~~자동 만료/삭제(TTL) 없음~~ → **2026-07-29 구현 완료.** `npm run retention:preview`/
  `retention:apply`(`src/data/retentionService.ts`, `src/domain/retention/policy.ts`)가
  익명 세션 연결 로그성 테이블을 나이 기준으로 정리한다(`docs/DATA-DELETION.md`). 아직
  cron 등 자동 스케줄에 연결하지 않았다 — 사람이 주기적으로 실행하거나 스케줄러에 등록해야
  한다.
- ~~사용자 삭제/열람 요청 처리 절차 없음~~ → **2026-07-29 구현 완료.** `/privacy` 페이지에서
  누구나 (1) 본인 세션 데이터 삭제 (2) 제보에 남긴 이메일 삭제를 요청할 수 있고,
  `/admin/privacy-requests`에서 관리자가 검토 후 실행한다(`docs/DATA-DELETION.md`). "열람"
  (자신의 데이터를 내려받아 볼 수 있는 기능)은 아직 없다 — 다음 마일스톤 후보.
- **백업 정책 미수립** — SQLite/PostgreSQL 모두 백업 주기·보관 기간이 정해지지 않았다.

## 원칙 (계속 유지할 것)

- 분석 이벤트는 처음부터 익명으로 설계됐으므로(`docs/ANALYTICS.md`) "삭제 요청"이 원천적으로
  걸릴 일이 적다 — 이 설계를 앞으로도 유지한다(로그인·이메일 수집 확대 시 이 문서를 반드시
  다시 검토한다).
- `observations`처럼 불변으로 설계된 로그 테이블에 `UPDATE`를 추가하지 않는다(문서 06 §6).
