# 보안 점검 기록

## 비밀정보 감사 (2026-07-27, 두 번째 마일스톤 착수 전)

검사 방법 (저장소 부담 최소 기준 — 외부 도구 없이 git 내장 기능):

| 검사 | 명령 | 결과 |
|---|---|---|
| 작업 트리 상태 | `git status` | clean |
| 추적 파일 중 민감 파일 | `git ls-files` 필터(.env/.db/.log/snapshot) | `.env.example` 1건만 추적(자리표시자만 포함) |
| ignore 동작 | `git check-ignore -v` | `.env`, `*.db` 정상 차단 |
| **이력 전체 키 포함 여부** | `git log --all -S'<키 값>'` (pickaxe) | **0건 — 키가 커밋된 적 없음** |
| 이력 전체 본문 검색 | `git grep -l '<키 값>' $(git rev-list --all)` | 0건 |
| `.env.example` 이력 값 | `git log --all -p --follow` | 모든 버전에서 `KOBIS_API_KEY=` / `KMDB_API_KEY=` 빈 값만 존재 |

판정: **실제 API 키는 Git 이력에 포함된 적이 없다.** 키 교체·이력 재작성 불필요.
(키가 로컬 `.env.example`에 잠시 입력된 적이 있으나, 커밋 전에 gitignore된 `.env`로 이동 조치됨.)

CI에는 gitleaks 기반 secret scan 잡이 추가되어 이후 커밋을 상시 검사한다.

## 비밀정보 취급 규칙

1. 실제 키·비밀번호는 `.env`(gitignore)에만 둔다. `.env.example`에는 변수명과 설명만.
2. SQLite DB 파일(`*.db`), 로그, API 응답 원문 캐시는 커밋하지 않는다
   (`external_observations.raw_excerpt`는 DB 내부에만 저장되며 DB는 비추적).
3. 동기화 CLI·테스트 출력에 키 값이나 민감 응답 전문을 출력하지 않는다.
4. 키가 이력에 포함된 것이 확인되면: 값 재출력 금지 → 노출 보고 → 키 교체 권고 →
   이력 재작성은 사용자 승인 후에만.

## 관리자 인증

- `ADMIN_PASSWORD` 환경변수 기반. 미설정 시 `/admin` 전체가 비활성(운영 무방비 노출 방지).
- 세션: `ADMIN_PASSWORD`로 서명한 HMAC 토큰을 httpOnly·SameSite=Lax 쿠키에 저장.
- 비밀번호·토큰은 로그·응답 본문에 출력하지 않는다.

## 환경변수 목록

| 변수 | 위치 | 용도 |
|---|---|---|
| `KOBIS_API_KEY` | 루트 `.env` | KOBIS 동기화 CLI (앱 런타임에는 불필요) |
| `KMDB_API_KEY` | 루트 `.env` | KMDb 어댑터·연결 CLI (2026-07-29 구현 완료, `docs/KMDB-INTEGRATION.md`) |
| `ADMIN_PASSWORD` | 루트 `.env` / 배포 환경 | 관리자 화면·API 인증 |
| `CRON_SECRET` | 배포 환경(Vercel) | `/api/admin/cron/*` 인증(`docs/DEPLOYMENT.md`) — 미설정 시 항상 401 |
| `CINEFIT_HASH_SECRET` | 배포 환경 | 제보·삭제요청 남용 방지 세션 해시 salt(운영은 고유값 필수) |
| `CINEFIT_INSECURE_COOKIE` | 개발·자체호스팅 전용 | 쿠키 Secure 플래그 강제 해제 — 운영(Vercel)에서는 설정 금지 |
| `DATABASE_PROVIDER`/`DATABASE_URL`/`DATABASE_DIRECT_URL`/`CINEFIT_ENV` | 배포 환경 | PostgreSQL 연결(`docs/DATABASE.md`, `docs/DEPLOYMENT.md`) |
| `CINEFIT_DB_PATH` | 선택 | SQLite 경로 재지정 |
| `CINEFIT_CLOCK_MODE` | 선택 | `system`(기본) / `demo` |
| `CINEFIT_DEMO_NOW` | 선택 | demo 모드 기준 시각(ISO) |
| `CINEFIT_ALLOW_SYNTHETIC` | 선택 | `true`면 검증 회차가 있어도 합성 회차 노출(개발·데모용) |
