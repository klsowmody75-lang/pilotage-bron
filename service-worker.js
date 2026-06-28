/* ═══════════════════════════════════════════════════════════
   ASTEL — Service Worker (network-first)
   Objectif : toujours servir la dernière version en ligne ;
   le cache ne sert QUE de secours hors-ligne.
   - N'intercepte que les requêtes GET de même origine.
   - Laisse passer Firebase / Firestore / Google Fonts / CDN
     (cross-origin) sans y toucher → la synchro n'est jamais gênée.
   ═══════════════════════════════════════════════════════════ */
const CACHE = 'astel-cache-v1';
const CORE = ['/', '/index.html'];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE).catch(() => {})));
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (e) => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;                       // jamais sur les écritures
  let url;
  try { url = new URL(req.url); } catch (_) { return; }
  if (url.origin !== self.location.origin) return;        // laisse passer Firebase / fonts / CDN

  e.respondWith((async () => {
    try {
      const fresh = await fetch(req);
      if (fresh && fresh.status === 200 && fresh.type === 'basic') {
        const c = await caches.open(CACHE);
        c.put(req, fresh.clone()).catch(() => {});
      }
      return fresh;
    } catch (err) {
      const cached = await caches.match(req);
      if (cached) return cached;
      if (req.mode === 'navigate') {
        const idx = (await caches.match('/index.html')) || (await caches.match('/'));
        if (idx) return idx;
      }
      throw err;
    }
  })());
});
