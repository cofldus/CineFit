# Phase 4 기술 검증 스파이크

문서 10(구현 계획)의 착수 전 검증 항목을 코드로 확인한다. 외부 의존성 없음 — Node.js 24+ 내장 기능(`fetch`, `node:sqlite`)만 사용.

## 구성

| 디렉터리 | 목적 | 실행 조건 |
|---|---|---|
| `api-feasibility/` | KOBIS·KMDb API 실호출, 식별자 연결 검증 | API 키 필요 (`.env`) |
| `minimal-db/` | 핵심 11개 테이블 스키마 + 실제 사실 기반 시드 | 없음 |
| `recommender/` | 추천 파이프라인(하드필터→점수→신뢰도→다양성→설명) 최소 검증 | `minimal-db` 시드 선행 |

## 실행 순서

```powershell
# 1. API 검증 (키 발급 후)
cd spikes/api-feasibility
copy .env.example .env   # 키 입력
node --env-file=.env kobis-boxoffice.mjs
node --env-file=.env kobis-movie.mjs "듄"
node --env-file=.env kmdb-movie.mjs "듄"
node --env-file=.env link-identifiers.mjs "듄"

# 2. 최소 DB 생성·시드
cd ../minimal-db
node seed.mjs            # → cinefit-spike.db 생성

# 3. 추천 엔진 스파이크
cd ../recommender
node recommend.mjs                          # 기본: 듄 파트 2, 서울시청 출발, 균형
node recommend.mjs --movie 오펜하이머 --priority quality
node recommend.mjs --movie "존 오브" --priority balance
```

## API 키 발급처

- **KOBIS 오픈API**: https://www.kobis.or.kr/kobisopenapi — 회원가입 → 키 발급 메뉴. 발급 시 **약관의 상업적 사용 조항·일일 쿼터를 `docs/90-verification-register.md` 항목 3에 인용할 것**.
- **KMDb API**: https://www.kmdb.or.kr/info/api/apiInfo — 한국영상자료원 오픈API 신청. 동일하게 약관을 레지스터 항목 4에 인용.

## 시드 데이터 주의

`minimal-db/seed.mjs`의 상영관 사양은 조사 보고서(문서 01)의 사실을 `info_status`·`confidence`와 함께 옮긴 것이고, **회차·가격은 파이프라인 검증용 합성 데이터**다(`sources.kind='spike_seed'`). 실서비스 시드로 사용 금지.

## 스파이크 판정 기준 (통과/실패)

1. KOBIS 영화 상세에서 상영타입·개봉일이 구조화되어 오는가
2. KMDb에서 동일 영화를 제목+감독+연도로 유일하게 특정할 수 있는가 (동명 영화 충돌률 확인)
3. 수동 입력 상영관·회차와 API 영화 데이터가 FK로 결합되는가
4. 추천 결과 3종(균형/품질/근접)이 이유·단점·근거·확인일과 함께 생성되는가
