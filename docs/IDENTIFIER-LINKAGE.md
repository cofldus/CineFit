# KOBIS↔KMDb 식별자 연결

- 기준일: 2026-07-29 (8차 마일스톤)
- 어느 KOBIS 영화(`movies` 행)가 어느 KMDb 문서(DOCID)인지 결정하는 일. KMDb 데이터
  자체를 가져와 반영하는 일(`docs/KMDB-INTEGRATION.md`)과는 분리된 문제다 — 연결이 되고
  나서야 `npm run sync:kmdb`가 의미를 갖는다.

## 매칭 신호 (`src/domain/identifierLinkage/matcher.ts`, 순수 함수)

- **제목**: 정규화(공백·구두점 제거·소문자화) 제목 일치, 또는 원제 일치.
- **감독**: `movies.director`(콤마 join)와 KMDb 후보의 감독 목록 교집합. 양쪽 중 하나라도
  정보가 없으면 `null`(판단 불가)로 남긴다 — 없다고 불일치로 단정하지 않는다.
- **제작연도**: `movie_releases`의 최초 개봉일 연도와 KMDb `prodYear`의 차이. 둘 중 하나라도
  없으면 `null`.
- 국가·러닝타임은 신호로 쓰지 않는다 — KMDb 검색 응답에 이 신호로 쓸 만큼 신뢰할 수 있는
  필드가 없다(`docs/KMDB-INTEGRATION.md`의 "검증된 필드만" 원칙과 동일).

## 등급

| 등급 | 조건 |
|---|---|
| `exact` | 제목 일치 + 감독 일치 + 연도 완전 일치 |
| `high_confidence` | 제목 일치 + (감독 일치 또는 연도 차이 ≤ 1) |
| `needs_review` | 제목은 일치하지만 감독·연도 둘 다 판단 불가(정보 부족) |
| `conflict` | 제목은 일치하지만 감독이 다르고 연도도 크게 다름(적극적으로 모순) |
| `unmatched` | 제목 자체가 다름 |

**자동 연결은 `exact`/`high_confidence` 등급에서 후보가 유일할 때만 일어난다.** 같은 등급의
후보가 여럿이면(동점) 자동 연결하지 않고 `needs_review`로 낮춰 사람이 고르게 한다
(`decideLinkage()`) — 애매한 상황에서 임의로 하나를 골라 잘못 연결하는 것보다, 사람이
보고 판단하는 쪽을 택했다.

## 데이터 모델

```sql
movie_identifier_candidates(
  id, movie_id, kmdb_docid, kmdb_title, match_tier, match_signals(JSON),
  status('pending'|'approved'|'rejected'), auto_linked, reviewed_by, reviewed_at, created_at
)
```

한 실행에서 발견한 후보를 전부 기록한다(영화당 여러 행 가능, `UNIQUE(movie_id, kmdb_docid)`).
자동 연결되면 그 후보 행만 `status='approved'`가 되고 `movies.kmdb_docid`가 채워진다. 모든
연결·해제·승인·거절은 `audit_logs`(`target_type='movie_identifier_link'`)에 남는다.

## 사용법

```bash
npm run sync:movie-identifiers -- --dry-run          # 변경 예측만
npm run sync:movie-identifiers                        # 미연결 영화 전체 대상
npm run sync:movie-identifiers -- --movie-id=5,7
npm run sync:movie-identifiers -- --review-only        # 등급이 높아도 자동 연결하지 않음
```

## 관리자 검토 (`/admin/data-linkage`)

- 목록 화면은 "자동 연결되지 않은" 영화만 보여준다(이미 승인된 연결이 있으면 목록에서
  빠진다).
- 상세 화면(`/admin/data-linkage/[movieId]`)에서 후보별 등급·신호(제목/감독/연도 일치
  여부)·상태를 보고 하나를 승인하거나 거절한다. 승인하면 그 영화의 다른 승인 후보는
  자동으로 거절 처리된다(연결은 항상 하나만).
- 이미 연결된 영화는 "연결 해제" 버튼으로 되돌릴 수 있다 — 잘못 연결된 영화가 추천에
  섞이는 것을 막는 마지막 안전장치다.

## 잘못 연결됐을 때

1. `/admin/data-linkage/[movieId]`에서 "연결 해제"를 누른다 — `movies.kmdb_docid`가 즉시
   비워지고, 그 영화가 참조하던 KMDb 기술 필드(`movie_technical_specs`, source=KMDb)는
   남아있지만 더 이상 유효한 연결과 짝지어지지 않는다(수동으로 정리해야 함 — 자동 삭제는
   하지 않는다, 삭제보다 이력 보존을 우선하는 원칙 `docs/DEVELOPMENT.md`).
2. 다시 `npm run sync:movie-identifiers -- --movie-id=<id>`를 돌리거나, 기존 후보 목록에서
   다른 후보를 승인한다.
