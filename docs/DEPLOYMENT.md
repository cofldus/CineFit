# 배포 체크리스트 — Vercel + Supabase

- 기준일: 2026-07-29 (8차 마일스톤)
- 관련 결정: ADR-6(`docs/08-architecture.md`), `docs/DATABASE.md`, `docs/ALPHA-PLAN.md`.
- **계정 생성·결제 정보 입력·실제 배포 실행은 사람이 직접 콘솔에서 해야 한다** — 이 문서는
  코드 쪽에서 이미 끝내둔 것과, 사람이 정확히 어떤 순서로 무엇을 클릭·입력해야 하는지를
  구분해 정리한 체크리스트다.

## A. 코드 쪽에서 이미 끝난 것 (추가 작업 불필요)

- 이중 방언 DB 클라이언트 + migration 러너, pg Pool 안전장치(`docs/DATABASE.md`).
- SQLite→PostgreSQL 데이터 이전 도구(`npm run db:import-sqlite`, `docs/DATABASE.md`).
- `/api/health` — DB 연결 확인용 헬스 체크(인증 불필요, 배포 후 스모크 테스트용).
- `vercel.json` — 유지보수 CLI를 감싼 Cron 라우트 3개 등록(§D "Cron" 참고).
- `CRON_SECRET` 기반 Cron 인증(`src/lib/cronAuth.ts`) — 미설정 시 항상 401(안전 기본값).
- 구조화 로깅(`src/lib/logger.ts`, `docs/OPERATIONS.md` "관측성").
- `package.json`의 `engines.node`(`>=24`) — `node:sqlite` 내장 모듈 요구사항 명시(§D 참고,
  실제 운영은 PostgreSQL만 쓰지만 이 모듈이 정적으로 import돼 있어 Node 버전이 낮으면 앱 전체가
  시작조차 못 한다).
- 비공개 알파 게이트(`private_alpha_gate`, 기본 꺼짐), 데이터 보존·삭제 요청 흐름
  (`docs/DATA-DELETION.md`), 알파 운영 대시보드(`docs/OPERATIONS.md`) — 전부 구현·테스트 완료.

## B. Supabase — PostgreSQL 프로비저닝 (사람이 직접)

1. [supabase.com](https://supabase.com)에서 계정 생성 → 새 프로젝트 생성.
2. **리전은 서울(ap-northeast-2)을 선택한다**(ADR-6 — 국내 서비스 지연 최소화).
3. 요금제: 상시 가동이 필요하므로 무료 티어(일정 시간 미사용 시 일시정지)가 아닌 **Pro
   플랜**을 선택한다(알파 운영 중 접속 실패를 막기 위함).
4. 프로젝트 생성 후 **Project Settings → Database**에서 연결 문자열 두 개를 확인한다:
   - **Connection pooling(Transaction 모드, PgBouncer)** 문자열 → `DATABASE_URL`로 쓴다.
   - **Direct connection** 문자열 → `DATABASE_DIRECT_URL`로 쓴다(migration·import 전용).
5. 이 두 값을 안전한 곳(비밀번호 관리자 등)에 잠시 보관한다 — 아래 C에서 Vercel에 그대로
   입력한다.
6. **로컬 컴퓨터에서** (아직 Vercel에 배포하기 전) 두 문자열로 스키마를 만든다 — `DATABASE_PROVIDER=postgres`를
   반드시 함께 지정한다(빠뜨리면 `db/migrate.mjs`가 조용히 로컬 SQLite를 건드리고 운영
   Postgres는 그대로 비어 있는다):
   ```bash
   DATABASE_PROVIDER=postgres DATABASE_DIRECT_URL="<direct 연결 문자열>" node db/migrate.mjs
   DATABASE_PROVIDER=postgres DATABASE_DIRECT_URL="<direct 연결 문자열>" node db/migrate.mjs --status  # 7개 전부 적용 확인
   ```
7. **초기 데이터 채우기 — 반드시 아래 순서를 그대로 따른다(§E "합성 데이터 오염" 필독)**:
   1. 로컬 SQLite로 실제 서비스에 쓸 참조 데이터를 만든다(합성 회차 시드는 건너뛴다 — 아래
      "주의"):
      ```bash
      node spikes/minimal-db/seed.mjs   # 영화·상영관·사양 데이터 + 합성(스파이크) 회차 포함
      node db/migrate.mjs
      node db/seed-seat-zones.mjs
      node db/seed-aliases.mjs
      node db/seed-feature-flags.mjs
      # db/seed-identifier-candidates.mjs는 실행하지 않는다 — 관리자 화면 데모용 가짜 KMDb
      # 연결 후보이며 실제 KMDb 데이터가 아니다.
      ```
   2. **주의 — 합성 회차 제거**: 위 1단계의 `spikes/minimal-db/seed.mjs`가 만드는 회차는
      전부 검증용 합성 데이터(`showtimes.is_synthetic = 1`)다. `db:import-sqlite`는 테이블
      전체를 그대로 옮기므로, 지우지 않고 이전하면 **운영 DB에 가짜 회차가 그대로 들어간다**.
      이전하기 전에 로컬 SQLite에서 반드시 지운다:
      ```bash
      node -e "
        const { DatabaseSync } = require('node:sqlite');
        const db = new DatabaseSync('spikes/minimal-db/cinefit-spike.db');
        const r = db.prepare('DELETE FROM showtimes WHERE is_synthetic = 1').run();
        console.log('합성 회차 삭제:', r.changes, '건');
      "
      ```
   3. 정리된 로컬 SQLite를 운영 Postgres로 이전한다(먼저 `--dry-run`으로 예상 건수 확인 —
      `showtimes`가 0건인지 반드시 확인한 뒤에만 진행한다):
      ```bash
      npm run db:import-sqlite -- --dry-run
      npm run db:import-sqlite
      ```
      `recommendation_runs`도 함께 이전된다 — 로컬에서 개발하며 만든 테스트용 추천 실행
      기록이라 개인정보는 없지만, 운영 첫날부터 `/admin/alpha-ops` 퍼널 집계에 잡음으로
      섞인다. 신경 쓰인다면 이전 전에 로컬 SQLite에서 `DELETE FROM recommendation_runs`로
      비워도 된다(선택 사항).
   4. 실제 회차(상영 시간표)는 합성 데이터 대신 `/admin/showtimes/new`에서 공식 예매
      페이지를 확인하며 하나씩 등록한다(`docs/DEVELOPMENT.md` 운영 절차 — 삭제 없이 항상
      이력이 남는다).

## C. Vercel — 앱 배포 (사람이 직접)

1. [vercel.com](https://vercel.com)에서 계정 생성 → GitHub 저장소(`cofldus/CineFit`) 연결 →
   새 프로젝트로 import.
2. 요금제: 상업적 사용에 적합한 **Pro 플랜**을 선택한다(ADR-6 — Hobby는 비상업 용도 전제).
3. **Project Settings → General → Node.js Version**에서 프로젝트가 지원하는 가장 높은
   버전(24 이상)을 선택한다 — 반드시 배포 전에 확인한다(§D "Node 버전" 필독, 이 값이 낮으면
   `node:sqlite` 모듈 해석에 실패해 앱이 아예 뜨지 않는다).
4. **Project Settings → Environment Variables**에서 아래 표의 값을 전부 설정한다
   (Production 환경 기준):

   | 변수 | 값 |
   |---|---|
   | `CINEFIT_ENV` | `production` |
   | `DATABASE_PROVIDER` | `postgres` |
   | `DATABASE_URL` | Supabase pooled 연결 문자열 |
   | `DATABASE_DIRECT_URL` | Supabase direct 연결 문자열 |
   | `ADMIN_PASSWORD` | 새로 생성한 강력한 비밀번호(운영 전용, 로컬 `.env`와 다른 값) |
   | `CRON_SECRET` | 새로 생성한 임의의 긴 문자열(예: `openssl rand -hex 32`) |
   | `CINEFIT_HASH_SECRET` | 새로 생성한 임의의 긴 문자열(제보·삭제요청 남용 방지 salt) |
   | `KOBIS_API_KEY` | (선택) 실제 KOBIS 동기화를 쓸 경우 |
   | `KMDB_API_KEY` | (선택) 실제 KMDb 동기화를 쓸 경우 |

   `CINEFIT_INSECURE_COOKIE`, `CINEFIT_CLOCK_MODE`, `CINEFIT_DB_PATH`,
   `CINEFIT_ALLOW_SYNTHETIC`는 운영에 설정하지 않는다(개발·테스트 전용, `.env.example` 참고).
5. Deploy를 누른다. 빌드 로그에서 `next build`가 정상 종료되는지 확인한다.
6. 배포 완료 후 **Project Settings → Cron Jobs**에서 `vercel.json`의 항목 3개
   (`maintenance-daily`, `maintenance-links`, `retention-apply`)가 인식됐는지 확인한다.

## D. 배포 후 스모크 테스트 (사람이 직접, 순서대로)

1. `https://<배포 도메인>/api/health` → `{"status":"ok","dbProvider":"postgres",...}` 확인.
2. `/admin/login`에서 새로 설정한 `ADMIN_PASSWORD`로 로그인 → `/admin` 대시보드가 뜨는지 확인.
3. `/admin/feature-flags`에서 `onboarding`·`private_alpha_gate` 두 플래그가 보이는지 확인
   (7단계에서 이전됨). **`private_alpha_gate`는 실제 알파를 시작하기 전까지 꺼진 상태로
   둔다.**
4. 등록한 실제 회차 하나로 `/movies` → `/recommend/[movieId]` → `/results` 흐름을 직접
   눌러보고 추천이 정상적으로 나오는지 확인한다.
5. `/cinemas/[auditoriumId]/report`에서 테스트 제보를 하나 제출 → `/admin/reports`에서 보이는지
   확인 → **테스트 제보는 반려 처리로 정리한다**(운영 데이터에 테스트 흔적을 남기지 않기 위해).
6. `/privacy`에서 두 폼이 정상적으로 뜨는지만 확인(실제 제출은 하지 않는다).
7. Cron 라우트 인증 확인(브라우저가 아니라 curl로) — `CRON_SECRET` 없이 호출하면 401이어야
   한다:
   ```bash
   curl -i https://<배포 도메인>/api/admin/cron/retention-apply
   ```

## E. 알려진 리스크·주의사항

- **Node 버전**: `node:sqlite`가 최상위에서 정적으로 import돼 있어(개발 편의를 위한 이중
  방언 설계, `docs/DATABASE.md`), 실제 운영은 PostgreSQL만 쓰더라도 Vercel의 Node.js 런타임이
  이 내장 모듈을 지원하는 버전이어야 앱이 시작된다. Vercel이 그 시점에 지원하는 Node 버전
  목록에 24 이상이 없다면(플랫폼 정책은 수시로 바뀔 수 있어 이 문서가 확정할 수 없다), 배포
  전에 반드시 확인하고 필요하면 사람이 직접 Vercel 지원팀에 문의하거나 대안을 검토해야 한다.
- **합성 데이터 오염**: 위 B-7단계를 건너뛰고 곧바로 `db:import-sqlite`를 돌리면 검증용 가짜
  회차가 운영 DB에 들어간다 — 반드시 `is_synthetic = 1` 행을 지운 뒤 이전한다.
- **Vercel Cron 스케줄 제한**: Hobby 플랜은 하루 1회로 제한된다 — Pro 플랜 기준으로
  `vercel.json`을 작성했다(매일 1회 + 주 1회 2건). Hobby로 운영한다면 스케줄을 다시 조정해야
  한다.
- **`maintenance-links` 실행 시간**: 활성 회차 수만큼 순차 HEAD 요청(요청 사이 500ms 지연)이라
  회차가 많아지면 기본 서버리스 함수 제한(10초)을 넘을 수 있다 —
  `app/api/admin/cron/maintenance-links/route.ts`에 `maxDuration = 60`을 지정해뒀지만,
  Vercel 플랜별 상한을 벗어나지 않는지 확인한다.
- **KOBIS 상업적 사용 범위**: KOFIC 서면 확인이 아직 없다(`docs/ALPHA-PLAN.md`) — 실제
  알파 시작 전 확인이 필요하다.
- **보존 기간 미확정**: `npm run retention:apply`가 자동 실행되지만 보존 일수 자체는 아직
  법률 검토 전 잠정값이다(`docs/DATA-RETENTION.md`).
- **백업 정책 미수립**: Supabase Pro의 자동 백업 설정(보관 기간 등)을 사람이 직접 확인·조정
  해야 한다 — 이 문서가 다루는 범위 밖이다.

## F. 롤백

- **앱**: Vercel 대시보드 → Deployments에서 이전 배포로 즉시 롤백 가능(Vercel 기본 기능).
- **DB 스키마**: 이 프로젝트의 migration 러너는 내려가는(down) migration을 지원하지 않는다
  (`db/migrate.mjs` — 항상 위로만 적용). 스키마를 되돌려야 하는 상황이면 Supabase의 시점
  복원(point-in-time recovery, Pro 플랜) 기능을 사용한다.
- **기능 플래그**: 문제가 생긴 기능은 코드 롤백 대신 `/admin/feature-flags`에서 즉시 끌 수
  있는 경우가 많다(`private_alpha_gate` 등) — 배포 롤백보다 빠르다.
