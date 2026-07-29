# 테스트 가이드

- 기준일: 2026-07-28

## 1. 테스트 계층

| 계층 | 명령 | 파일 |
|---|---|---|
| 단위 | `npm test` | `tests/unit/*.test.ts` (엔진·클록·검증·좌석존·KOBIS 매퍼) |
| API | `npm test` | `tests/api/*.test.ts` (임시 DB 직접 시드 — 라이브 DB 파일 복사 금지) |
| 리포지토리 계약 | `npm test` (+ `CINEFIT_TEST_PG_URL` 설정 시 PostgreSQL도) | `tests/contracts/repositoryContracts.test.ts` |
| E2E 기능 | `npx playwright test e2e/{flow,admin-flow,report-flow,admin-evaluation-flow}.spec.ts` | 사용자 흐름·관리자 회차 운영·제보 승격 파이프라인·피드백→품질 대시보드 반영 |
| 시각 회귀 | `npx playwright test e2e/visual.spec.ts` | 핵심 화면 10개 스크린샷 |
| 접근성 | `npx playwright test e2e/accessibility.spec.ts` | axe-core, 라이트·다크 × 9화면 |

CI(`.github/workflows/ci.yml`)는 `quality` job에서 lint·typecheck·db 시드·단위/API/계약
테스트·build를, `e2e` job에서 `npx playwright test`(위 표의 모든 Playwright 스펙 —
기능+시각 회귀+접근성)를 실행한다. 별도 게이트 추가 없이 스펙 파일만 늘리면 CI가
자동으로 커버한다.

## 2. 시각 회귀 베이스라인 — 반드시 리눅스에서 생성한다

`e2e/visual.spec.ts-snapshots/*-linux.png`는 로컬(Windows/macOS)에서 생성하면 폰트
렌더링 차이로 **CI(ubuntu-latest)에서 항상 실패**한다. 베이스라인은 CI와 동일한 리눅스
컨테이너에서 생성·갱신해야 한다:

```bash
# Windows Git Bash 기준 — MSYS_NO_PATHCONV=1로 경로 변환 오작동 방지
MSYS_NO_PATHCONV=1 docker run --rm \
  -v "/c/경로/CineFit:/work" \
  -v /work/node_modules \
  -w /work -e HOME=/tmp \
  mcr.microsoft.com/playwright:v1.62.0-noble \
  bash -lc "npm ci --no-audit --no-fund && npm run build && npx playwright test --update-snapshots"
```

- `-v /work/node_modules`(익명 볼륨)로 컨테이너의 리눅스용 `node_modules`가 호스트의
  윈도우용 `node_modules`를 덮어쓰지 않게 격리한다. 매 실행마다 `npm ci`를 다시 하므로
  컨테이너 이미지 버전(`mcr.microsoft.com/playwright:vX.Y.Z-noble`)은 `package.json`의
  `@playwright/test` 버전과 반드시 맞춰야 한다(`npx playwright --version`으로 확인).
- 로컬에서 실수로 만들어진 `*-win32.png`/`*-darwin.png`는 커밋하지 않는다(git에 없으면
  무시, 있다면 삭제).
- 실패 시 `--update-snapshots` 없이 먼저 재실행해 **실제로 의도된 변경**인지 확인한
  뒤에만 갱신한다(섹션 28 원칙) — diff 없이 통과하면 그대로 두고, diff가 있으면
  스크린샷을 열어 리뷰한다.
- 로컬 빌드(Windows) 직후 이 컨테이너를 실행하면 `.next`가 리눅스 바이너리로 덮어써져
  다음 로컬 `npm run start`가 `Cannot find package 'pg-<hash>'` 류 오류로 깨진다 —
  컨테이너 실행 후 로컬에서 다시 테스트하려면 `rm -rf .next && npm run build`로
  다시 빌드한다.

## 3. `playwright.config.ts`의 `workers: 1`

모든 스펙 파일이 격리된 **하나의** SQLite 파일(`test-results/e2e.db`, `global-setup.ts`가
생성)을 공유한다. 병렬 워커로 돌리면 `admin-flow.spec.ts`처럼 DB를 변경하는 테스트와
`visual.spec.ts`의 스크린샷이 실행 순서에 따라 서로 다른 상태를 보게 되어 비결정적으로
실패한다(발견 경위: `report-flow.spec.ts` 도입 중 상영관 상세 스크린샷이 어긋남).
`workers: 1` + `fullyParallel: false`로 스펙 파일 실행 순서를 고정해 결정적으로
만들었다 — 테스트 수가 적어 성능 영향은 미미하다(전체 스위트 20~45초).

## 4. 알려진 이슈 — SQLite 셀프호스트 + 리눅스에서 드문 쓰기-직후-읽기 지연

`report-flow.spec.ts`(제보 생성·승격) 직후 `visual.spec.ts`의 관리자 제보 큐 스크린샷이
**리눅스 컨테이너에서만** 방금 생성된 제보를 0건으로 보여주는 현상을 재현 확인했다
(Windows에서는 동일 순서로 재현 안 됨). 직접 DB 파일을 조회하고 수동으로 서버를 띄워
확인한 결과 데이터 자체는 정확히 저장돼 있었고, `page.reload()` 추가로도 해결되지
않았다 — `node:sqlite` 관련 플랫폼 차이로 추정되나 근본 원인은 확정하지 못했다.

**영향 범위**: 프로덕션은 `CINEFIT_ENV=production`에서 PostgreSQL만 허용되므로(문서
`docs/DATABASE.md`) 이 경로의 영향을 받지 않는다. 다만 문서가 이미 지원 대상으로 명시한
"셀프호스트(단일 노드) + SQLite + 리눅스" 배포에는 영향을 줄 수 있다. 후속 조사가
필요하면 `e2e/visual.spec.ts`의 "관리자 제보 큐" 테스트 주석에서 시작할 것.

## 5. 로컬 실행 전 체크리스트

```bash
npm run lint && npm run typecheck && npm test && npm run build
npx playwright test e2e/flow.spec.ts e2e/admin-flow.spec.ts e2e/report-flow.spec.ts  # 기능
npx playwright test e2e/accessibility.spec.ts                                        # 접근성(로컬 OS에서도 유효)
# 시각 회귀는 위 §2의 도커 절차로만 검증한다(로컬 OS 실행은 무의미)
```

## 6. CI의 `e2e` job은 반드시 §2와 동일한 컨테이너 안에서 실행한다

**2026-07-28 발견·수정**: `e2e` job이 처음 도입된 커밋(`4a5ac2d`)부터 실제 CI에서 계속
실패하고 있었다(GitHub Actions API로 재검증해 확인 — 최소 9개 커밋에서 전부 실패,
문서·이전 세션 보고에는 이 사실이 반영되지 않았었다). 원인은 `ubuntu-latest` 러너에
`actions/setup-node` + `npx playwright install --with-deps chromium`만 설치했을 뿐,
§2의 베이스라인을 만든 `mcr.microsoft.com/playwright:vX.Y.Z-noble` **컨테이너 자체
안에서 실행하지 않았기 때문**이다 — 두 환경의 폰트 구성이 달라 텍스트 줄바꿈·페이지
높이 자체가 달라졌다(픽셀 노이즈 수준이 아니라 "Expected 1464px, received 844px"처럼
이미지 크기 자체가 달랐다). 로컬 재현: `node:24-bookworm` + 수동 설치 조합에서도 동일하게
11개 시각 회귀 테스트가 구조적으로 실패함을 확인했다.

**수정**: `.github/workflows/ci.yml`의 `e2e` job에 `container: mcr.microsoft.com/playwright:v1.62.0-noble`을
추가해 §2와 완전히 동일한 이미지 안에서 돌게 했다(`actions/setup-node`·수동 브라우저 설치
단계 제거 — 컨테이너에 이미 Node·Chromium이 들어있다). 이제 "로컬에서 이 컨테이너로 만든
베이스라인"과 "CI가 검증하는 환경"이 이미지 레벨에서 동일하다.

**교훈**: 문서에 "CI와 동일한 환경"이라고 적혀 있어도, 실제 CI 실행 결과(GitHub Actions
API/UI)로 주기적으로 재검증하지 않으면 이런 괴리가 오래 발각되지 않는다 — 로컬 Docker
실행이 여러 번 통과했다는 사실이 실제 CI 통과를 보장하지 않는다.
