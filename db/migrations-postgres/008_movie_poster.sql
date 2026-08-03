-- KMDb 공식 API가 제공하는 포스터 URL 저장 — 무단 수집이 아니라 이미 사용 중인
-- 공식 오픈API의 posters 필드(영상자료원 서버 호스팅)다. 없는 영화는 NULL 유지(추정 금지).
ALTER TABLE movies ADD COLUMN poster_url TEXT;
