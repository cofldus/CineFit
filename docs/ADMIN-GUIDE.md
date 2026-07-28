# 관리자 가이드

- 기준일: 2026-07-28 (7차 마일스톤)
- 반복 운영 작업(주기·체크리스트)은 `docs/OPERATIONS.md`를 참고한다. 이 문서는 각 화면이
  "무엇을 위한 것인지"와 처음 쓸 때 알아야 할 것을 정리한다.

## 로그인

`/admin/login`에서 `ADMIN_PASSWORD` 환경변수 값을 입력한다. 성공하면 HMAC 서명된 쿠키
(`cinefit_admin`)가 발급되고, 이후 모든 `/admin/*` 서버 컴포넌트와 `/api/admin/*` 라우트가
이 쿠키(또는 `x-admin-token` 헤더)로 인증한다. 비밀번호 미설정 시 관리자 기능 전체가
꺼진다(운영 무방비 노출 방지 — `src/lib/adminAuth.ts`).

현재 단일 비밀번호 + 단일 세션 모델이다(1인 운영 전제). 여러 관리자가 함께 운영해야 하면
`actor` 필드가 항상 `'admin'` 고정값이라는 한계부터 먼저 해결해야 한다(`docs/BETA-LIMITATIONS.md`).

## 화면별 안내

**대시보드 (`/admin`)** — 활성/관리자 확인/합성/비활성 회차 수와 검토 대기 제보 수를 한눈에.

**회차 관리 (`/admin/showtimes`, `.../new`, `.../[id]`)** — 회차 등록·수정·비활성화.
삭제 기능은 없다(비활성화만) — 모든 변경은 `showtime_changes`에 이력으로 남는다. 등록 시
반드시 공식 예매 페이지 URL을 딥링크로 함께 저장한다.

**제보 검토 (`/admin/reports`, `.../[id]`)** — 사용자가 낸 사실형 제보(좌석 구역, 상영관
사양, 접근성 등)를 검토해 승인/반려/중복 처리한다. 좌석 구역 제보는 승인 시 실제
`seat_zones`로 승격할 수 있다(`docs/DATA-PROMOTION-POLICY.md`의 신뢰도 상한 정책 적용).

**데이터 품질 (`/admin/quality`)** — 상영관별 데이터 완성도 등급, 지역별 분포, 추천 없음/
저신뢰 비율, 사용자 피드백 기반 실패 원인 집계. 숫자가 이상해 보이면 먼저 관련 목록
화면(회차 관리·제보 검토)으로 이동해 원인을 확인한다.

**예매 링크 상태 (`/admin/booking-links`)** — 각 회차 예매 URL의 최근 검증 상태. 검증
자체는 이 화면에서 실행할 수 없다 — 터미널에서 `npm run maintenance:links`를 돌려야 갱신된다.

**기능 플래그 (`/admin/feature-flags`)** — 새 플래그는 소문자·숫자·밑줄로 된 키로
만든다(예: `onboarding`). 켜기 전에 관련 기능이 실제로 준비됐는지 확인한다. 모든 on/off·
생성 이력은 `audit_logs`(`target_type='feature_flag'`, 실제 키·이전/이후 값은 `detail` JSON에)에
남는다.

## CLI 참고

| 명령 | 설명 |
|---|---|
| `npm run db:seed` | 로컬 SQLite 시드(영화·상영관·회차·좌석 존·별칭·기능 플래그 전부) |
| `npm run maintenance:daily` / `:stale` / `:links` | `docs/OPERATIONS.md` 참고 |
| `npm run eval:recommendations` | 추천 품질 회귀 확인(`docs/RECOMMENDATION-EVALUATION.md`) |
| `npm run compare:recommendations -- --run-id=N` | 특정 과거 실행을 다른 정책으로 재계산 비교 |
| `npm run sync:kobis -- --movie-code=...` | KOBIS 공식 배급 버전 동기화(`docs/DEVELOPMENT.md`) |
