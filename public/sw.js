// 최소 서비스워커 — 앱 셸 캐시 + 오프라인 내비게이션 폴백만 담당.
// 워크박스 등 미도입 이유: 첫 마일스톤은 오프라인 안내 화면만 요구되며,
// 데이터(추천 결과)는 신뢰도·확인일이 생명이라 오프라인 캐시 제공이 오히려 위험 (docs/DEVELOPMENT.md 참고)
const CACHE = 'cinefit-shell-v1';
const SHELL = ['/offline', '/icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(() => caches.match('/offline')));
  }
});
