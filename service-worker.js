/* ASTEL - Service Worker (network-first)
   Corrige le conflit avec firebase-messaging-sw.js (notifications push).
   -> Ne renvoie JAMAIS une reponse redirigee (Safari la refuse).
   -> N'intercepte PAS le service worker des notifications. */

const CACHE = 'astel-cache-v2';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // 1) Ne JAMAIS intercepter le service worker des notifications
  //    (sinon Safari refuse de l'enregistrer -> "load failed" / "has redirections")
  if (url.pathname.endsWith('/firebase-messaging-sw.js')) return;

  // 2) Laisser passer tout ce qui n'est pas sur notre domaine
  //    (Firebase, Google Fonts, CDN, worker push...)
  if (url.origin !== self.location.origin) return;

  // 3) Reseau d'abord, cache en secours (hors-ligne)
  event.respondWith((async () => {
    try {
      const res = await fetch(req);
      // Safari refuse une reponse redirigee -> on la reconstruit "propre"
      if (res.redirected) {
        const body = await res.clone().blob();
        return new Response(body, {
          status: res.status,
          statusText: res.statusText,
          headers: res.headers
        });
      }
      if (res && res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
      }
      return res;
    } catch (e) {
      const cached = await caches.match(req);
      if (cached) return cached;
      throw e;
    }
  })());
});
