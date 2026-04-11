/* Nimba People — Service Worker v1.0 */
const CACHE = 'nimba-v1';
const OFFLINE_URL = '/';

/* Assets to cache immediately on install */
const APP_SHELL = [
  '/',
  '/manifest.json',
  '/icons/icon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  'https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=Inter:wght@400;500;600&display=swap',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
];

/* ── INSTALL — cache app shell ── */
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(APP_SHELL.filter(url => !url.startsWith('http') || url.includes('fonts.googleapis'))))
      .then(() => self.skipWaiting())
  );
});

/* ── ACTIVATE — clean old caches ── */
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

/* ── FETCH — smart caching strategies ── */
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  /* Skip non-GET and chrome extensions */
  if (e.request.method !== 'GET') return;
  if (url.protocol === 'chrome-extension:') return;

  /* Supabase API → Network first, fallback to cache */
  if (url.hostname.includes('supabase.co')) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  /* Google Fonts → Stale while revalidate */
  if (url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com')) {
    e.respondWith(
      caches.open(CACHE).then(cache =>
        cache.match(e.request).then(cached => {
          const network = fetch(e.request).then(res => {
            cache.put(e.request, res.clone());
            return res;
          });
          return cached || network;
        })
      )
    );
    return;
  }

  /* App shell & CDN scripts → Cache first */
  if (url.hostname.includes('cdnjs.cloudflare.com') || url.hostname.includes('cdn.jsdelivr.net')) {
    e.respondWith(
      caches.match(e.request)
        .then(cached => cached || fetch(e.request).then(res => {
          caches.open(CACHE).then(c => c.put(e.request, res.clone()));
          return res;
        }))
    );
    return;
  }

  /* Same-origin requests → Network first, fallback to cache, fallback to offline page */
  if (url.origin === self.location.origin) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          if (res.ok) {
            caches.open(CACHE).then(c => c.put(e.request, res.clone()));
          }
          return res;
        })
        .catch(() =>
          caches.match(e.request)
            .then(cached => cached || caches.match(OFFLINE_URL))
        )
    );
  }
});

/* ── PUSH NOTIFICATIONS ── */
self.addEventListener('push', e => {
  if (!e.data) return;

  let data = {};
  try { data = e.data.json(); } catch { data = { title: 'Nimba People', body: e.data.text() }; }

  const options = {
    body: data.body || 'You have a new notification',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: data.tag || 'nimba-notification',
    data: { url: data.url || '/' },
    actions: data.actions || [],
    requireInteraction: data.requireInteraction || false,
    vibrate: [200, 100, 200],
  };

  e.waitUntil(self.registration.showNotification(data.title || 'Nimba People', options));
});

/* ── NOTIFICATION CLICK ── */
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.notification.data?.url || '/';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        const existing = clientList.find(c => c.url.includes(self.location.origin));
        if (existing) return existing.focus().then(c => c.navigate(url));
        return clients.openWindow(url);
      })
  );
});

/* ── BACKGROUND SYNC — queue offline leave submissions ── */
self.addEventListener('sync', e => {
  if (e.tag === 'sync-leaves') {
    e.waitUntil(syncOfflineLeaves());
  }
});

async function syncOfflineLeaves() {
  const cache = await caches.open('nimba-offline-queue');
  const keys = await cache.keys();
  for (const req of keys) {
    try {
      const response = await fetch(req.clone());
      if (response.ok) await cache.delete(req);
    } catch {}
  }
}
