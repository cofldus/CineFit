# 데이터베이스

- 기준일: 2026-07-29 (8차 마일스톤)
- 이 문서는 여러 문서(`docs/BETA-LIMITATIONS.md`, `docs/ALPHA-PLAN.md`, `.env.example`)에서
  참조되지만 지금까지 실제로 존재하지 않았다 — 8차 마일스톤 PostgreSQL 운영 준비 작업 중
  발견해 새로 작성했다.

## 이중 방언 설계

`src/data/client/index.ts`가 `DATABASE_PROVIDER` 환경변수(`sqlite` | `postgres`)로 실제
구현체를 고른다. 리포지토리 코드는 전부 `DbClient` 인터페이스(`src/data/client/types.ts`)만
알고, `?` 플레이스홀더 하나만 쓴다 — PostgreSQL 클라이언트가 내부적으로 `$1,$2,...`로
변환한다(`toPgPlaceholders`, `src/data/client/postgresClient.ts`).

- **개발 기본값**: `DATABASE_PROVIDER` 미설정 시 SQLite(`node:sqlite`, `spikes/minimal-db/cinefit-spike.db`).
- **운영 강제**: `CINEFIT_ENV=production`이면 `DATABASE_PROVIDER=postgres`가 아닐 경우 앱이
  시작 단계에서 즉시 실패한다(`resolveProvider()`) — 서버리스·다중 인스턴스 환경에서 SQLite를
  영속 저장소로 쓰는 실수를 원천 차단한다.

## 연결 문자열 — pooled vs direct

```env
DATABASE_URL=          # 앱 런타임(요청마다 다수 동시 접속) — pooled 연결 권장
DATABASE_DIRECT_URL=   # migration·import 전용 — 미설정 시 DATABASE_URL로 폴백
```

Supabase처럼 앱단 커넥션 풀러(PgBouncer)를 앞에 두는 관리형 PostgreSQL은 이 두 값이 서로
다른 포트/호스트를 가리킨다(`docs/DEPLOYMENT.md`, ADR-6 — `docs/08-architecture.md`).
로컬 개발은 둘 다 같은 값(`npm run pg:up`으로 띄운 로컬 컨테이너)을 쓴다.

## 운영 안전장치 (`src/data/client/postgresClient.ts`)

| 옵션 | 값 | 이유 |
|---|---|---|
| `max` | 10 | 커넥션 풀 상한 |
| `connectionTimeoutMillis` | 10,000 | 풀이 소진되면 요청 하나만 실패시키고 앱 전체를 막지 않음 |
| `idleTimeoutMillis` | 30,000 | 유휴 커넥션 회수 |
| `statement_timeout` | 30,000 | 쿼리 하나가 멈춰도 DB가 강제 종료 |
| `query_timeout` | 35,000 | 드라이버 쪽 타임아웃(네트워크 단절 대비, statement_timeout보다 여유를 둠) |
| `ssl` | localhost 제외 강제 | 관리형 PG는 TLS 필수 |

정상 종료(graceful shutdown): `src/data/client/index.ts`가 `SIGTERM`/`SIGINT` 수신 시
커넥션 풀을 닫고 종료한다. Vercel 같은 서버리스 환경에서는 인스턴스 수명이 요청 단위로
짧아 이 훅이 사실상 호출되지 않지만, 자체 호스팅·로컬 실행에서는 의미가 있다.

## Migration 러너 (`db/migrate.mjs`)

```bash
npm run db:migrate           # 미적용 마이그레이션 적용
npm run db:status            # 적용/미적용 목록
npm run db:validate          # 미적용 있으면 종료 코드 1 (배포 파이프라인 게이트용)
```

- `schema_migrations` 테이블로 이력 추적, 파일 단위 트랜잭션, 재실행해도 안전(이미 적용된
  파일은 건너뜀).
- `DROP TABLE`/`DROP DATABASE`/`TRUNCATE`가 포함된 마이그레이션 파일은 실행 전에 거부한다
  (파괴적 변경은 별도 수동 절차로만).
- SQLite용 파일은 `db/migrations/`, PostgreSQL용은 `db/migrations-postgres/`에 따로
  둔다 — 방언별 문법 차이(예: `SERIAL` vs `INTEGER PRIMARY KEY`) 때문에 병합하지 않는다.
  두 디렉터리의 파일 수·이름이 항상 1:1로 대응하지는 않는다(PostgreSQL은 초기 3개 파일을
  `000_base.sql`로 통합했다 — 커밋 히스토리 참고).

## 로컬 PostgreSQL (`compose.yaml`)

```bash
npm run pg:up       # docker compose up -d --wait postgres (포트 127.0.0.1:55432)
npm run pg:status
npm run pg:logs
npm run pg:down
npm run pg:reset     # scripts/pg-reset.mjs — 볼륨까지 초기화
```

`db/pg-init/01-create-test-db.sql`이 최초 볼륨 생성 시 `cinefit_test`(계약 테스트 전용,
`cinefit_dev`와 분리)를 만든다. 기본 비밀번호(`cinefit-dev-only`)는 로컬·CI 전용이며 운영에
재사용하지 않는다.

## 계약 테스트를 PostgreSQL에서도 실행하기

```bash
CINEFIT_TEST_PG_URL=postgres://cinefit:cinefit-dev-only@127.0.0.1:55432/cinefit_test npm test
```

미설정 시 `tests/contracts/repositoryContracts.test.ts`의 PostgreSQL 블록은 스킵된다(SQLite
블록은 항상 실행). 2026-07-29 기준 실제 로컬 PostgreSQL에서 173/173 전체 테스트(계약 테스트
포함) 통과 확인함.

## SQLite → PostgreSQL 데이터 이전

`docs/OPERATIONS.md`와 `scripts/import-sqlite-to-postgres.ts` 참고. 요약: dry-run 먼저,
멱등(재실행해도 중복 삽입 없음), 실패 시 트랜잭션 전체 롤백.
