/**
 * Ted Duolingo — PWA 앱 셸 서비스워커 (오프라인 full reload 복원)
 *
 * 역할은 "앱 셸"(index.html + 해시된 JS/CSS 번들)만 캐시하는 것. 데이터 오프라인은
 * TanStack Query persist(lib/query-client.ts), 오프라인 쓰기는 sync-queue(lib/sync-queue.ts)가
 * 담당하므로 이 SW는 Supabase 등 교차 오리진 요청을 절대 가로채지 않는다.
 *
 * 이 파일은 dev에서는 등록되지 않는다(components/sw-register.tsx가 production-only 가드).
 * dev(Metro 메모리 서버)는 캐시할 해시 번들이 없어 SW가 오작동하기 때문.
 *
 * 캐시 버전(SHELL_CACHE)은 lib/query-client.ts의 CACHE_BUSTER(RQ 데이터 shape)와 독립적이다.
 * 셸 캐시 전략이 바뀔 때만 올린다. 번들 갱신은 해시 URL 변경으로 자동 처리되므로
 * 매 배포마다 올릴 필요 없다.
 */

const SHELL_CACHE = 'ted-shell-v1';
// 네비게이션 오프라인 fallback 키 — SPA 셸. 모든 클라이언트 라우트는 이 셸로 부팅된다.
const SHELL_URL = '/';
const PRECACHE_URLS = [SHELL_URL, '/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      // 새 SW가 즉시 대기 상태를 건너뛰고 활성화되도록
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== SHELL_CACHE).map((key) => caches.delete(key))),
      )
      // 활성화 즉시 열린 클라이언트를 control — e2e reload 검증·첫 방문 복원에 필수
      .then(() => self.clients.claim()),
  );
});

// network-first: 네트워크 우선, 성공 시 캐시 갱신, 실패 시 캐시 fallback
async function networkFirst(request, fallbackUrl) {
  try {
    const response = await fetch(request);
    // 정상 응답만 캐시(불투명/에러 응답 캐시 금지)
    if (response && response.ok) {
      const cache = await caches.open(SHELL_CACHE);
      cache.put(fallbackUrl || request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await caches.match(fallbackUrl || request);
    if (cached) return cached;
    throw err;
  }
}

// cache-first: 해시된 불변 에셋용. 캐시 히트 시 즉시 반환, 미스 시 fetch 후 저장
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response && response.ok) {
    const cache = await caches.open(SHELL_CACHE);
    cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // 1) 쓰기(비-GET)는 미개입 — sync-queue가 오프라인 쓰기 담당
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // 2) 교차 오리진(Supabase REST/Realtime 등)은 미개입 — 데이터 오프라인은 persist 담당
  if (url.origin !== self.location.origin) return;

  // 3) 네비게이션(HTML): network-first → 오프라인이면 셸 복원
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, SHELL_URL));
    return;
  }

  // 4) 해시된 정적 에셋(불변): cache-first
  if (url.pathname.startsWith('/_expo/static/') || url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // 5) 그 외 same-origin GET(매니페스트·아이콘·favicon 등): network-first
  event.respondWith(networkFirst(request));
});
