# 분석 이벤트 파이프라인

- 기준일: 2026-07-28 (7차 마일스톤)

## 원칙

- **화이트리스트 방식**: `src/analytics/analyticsEvents.ts`에 정의된 이벤트 이름과 속성
  스키마(Zod)에 없는 값은 저장 자체가 불가능하다. `.object()`는 기본(비-strict) 모드라
  스키마에 없는 속성은 조용히 제거된다 — 실수로 위치·자유 입력 전문이 섞여도 저장되지 않는다.
- **개인정보 최소화**: 정확한 GPS 좌표, 전체 IP, 광고 식별자, 자유 입력 전문은 어떤 이벤트
  스키마에도 없다. 위치는 `ORIGIN_PRESETS`의 지역 프리셋 id만 다룬다(`conditions_changed`
  이벤트도 필드 이름만 기록하고 값은 기록하지 않는다).
- **익명 세션**: 로그인 없이 `analytics_sessions` 테이블의 회전 가능한 랜덤 id로만 사용자를
  구분한다. 쿠키 이름은 `cinefit_session`(`src/lib/analyticsSession.ts`의 `ANALYTICS_COOKIE`).

## 데이터 모델

```
analytics_sessions(id, first_seen_at, last_seen_at, app_version)
analytics_events(id, session_id → analytics_sessions, event_name, properties JSON, created_at)
```

## 이벤트 목록 (16종, `src/analytics/analyticsEvents.ts`)

| 이벤트 | 속성 | 비고 |
|---|---|---|
| `app_opened` | — | 세션당 1회(sessionStorage 가드, `components/AppOpenedTracker.tsx`) |
| `movie_viewed` | movieId | |
| `movie_selected` | movieId | `MovieCard` 클릭 |
| `recommendation_started` | movieId | |
| `recommendation_completed` | recommendationRunId, movieId, candidateCount, resultTypes, processingTimeMs, dataConfidenceBucket, syntheticDataUsed | 서버(`app/results/page.tsx`)에서 직접 기록 |
| `recommendation_empty` | movieId, excludedCount | |
| `recommendation_card_viewed` | recommendationRunId, label | |
| `recommendation_detail_opened` | recommendationRunId, label | |
| `cinema_viewed` | auditoriumId | |
| `booking_link_clicked` | recommendationRunId?, showtimeId | `TrackedExternalLink` |
| `conditions_changed` | field(문자열, 값 아님) | |
| `condition_relaxed` | field | |
| `feedback_submitted` | recommendationRunId | |
| `issue_report_started` | auditoriumId? | |
| `issue_report_submitted` | reportId | |
| `alpha_survey_completed` | — | |

## 기록 경로

- **클라이언트**: `components/TrackedLink.tsx`(`track()` 호출) → `src/analytics/analyticsClient.ts`
  → `POST /api/analytics/events` (fire-and-forget, `keepalive: true`, 실패해도 UI를 막지 않음).
- **서버**: `app/results/page.tsx`처럼 서버 컴포넌트가 직접 결과를 아는 경우
  `serverAnalytics.recordEvent(...)`(`src/analytics/serverAnalytics.ts`)를 호출해 왕복 없이 기록한다.
- 두 경로 모두 내부적으로 `ensureSession(sessionId, ...)`을 먼저 호출해 세션 행을 만든다 —
  `recommendation_feedback`처럼 `session_id`를 참조하는 다른 테이블도 동일 원칙(먼저 세션을
  만들지 않으면 FK 오류가 난다, `tests/api/*.test.ts` 다수가 이 순서를 검증한다).

## 현재 한계

- ~~이벤트를 집계·시각화하는 전용 대시보드는 없다~~ → **2026-07-29 구현 완료**:
  `/admin/alpha-ops`가 초대·동의 현황과 사용 퍼널(앱 열림 → 영화 선택 → 추천 시작 → 추천
  완료 → 피드백 제출)을 원시 건수 + 백분율로 보여준다(`docs/OPERATIONS.md` "관측성·알파
  운영 대시보드"). `/admin/quality`는 여전히 `recommendation_runs`·`recommendation_feedback`
  파생 지표(추천 없음 비율, 저신뢰 비율, 실패 원인 분류)만 다루는 별개 화면이다. 개별 이벤트
  속성까지 파고드는 세밀한 조회는 아직 SQL이 필요하다.
- 보존 기간 자동 정리·삭제 요청은 구현됐다(`docs/DATA-DELETION.md`) — 다만 확정된 보존
  일수 자체는 아직 법률 검토 전 잠정값이다(`docs/DATA-RETENTION.md`).
