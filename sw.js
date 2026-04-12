/* Nimba People — Service Worker v1.1 */
const CACHE = 'nimba-v1';
const OFFLINE_URL = '/';

/* Allowed external origins — SSRF prevention */
const ALLOWED_ORIGINS = new Set([
  self.location.origin,
  'https://tpnppkcknqzjamwkqugo.supabase.co',
  'https://fonts.googleapis.com',
  'https://fonts.gstatic.com',
  'https://cdn.jsdelivr.net',
  'https://cdnjs.cloudflare.com',
  'https://unpkg.com',
]);

function isAllowedURL(url) {
  try {
    const parsed = new URL(url);
    // Only allow https (no http, no data:, no blob:)
    if (parsed.protocol !== 'https:') return false;
    // Check against allowlist
    return ALLOWED_ORIGINS.has(parsed.origin);
  } catch {
    return false;
  }
}

/* Assets to cache immediately on install */
const APP_SHELL = [
  '/',
  '/manifest.json',
  '/icons/icon.svg',
];

/* ── INSTALL ── */
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

/* ── ACTIVATE ── */
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

/* ── FETCH — with SSRF protection ── */
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const url = e.request.url;

  // Block chrome-extension and non-http schemes
  if (!url.startsWith('https://') && !url.startsWith('http://localhost')) return;

  // SSRF guard — only handle requests to allowed origins
  if (!isAllowedURL(url)) return;

  // Supabase API — Network first, cache fallback
  if (url.includes('supabase.co')) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          if (res.ok) {
            caches.open(CACHE).then(c => c.put(e.request, res.clone()));
          }
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Google Fonts — Stale while revalidate
  if (url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com')) {
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

  // CDN scripts — Cache first
  if (url.includes('cdnjs.cloudflare.com') || url.includes('cdn.jsdelivr.net') || url.includes('unpkg.com')) {
    e.respondWith(
      caches.match(e.request)
        .then(cached => cached || fetch(e.request).then(res => {
          if (res.ok) caches.open(CACHE).then(c => c.put(e.request, res.clone()));
          return res;
        }))
    );
    return;
  }

  // Same-origin — Network first, fallback to cache, fallback to offline
  if (url.startsWith(self.location.origin)) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          if (res.ok) caches.open(CACHE).then(c => c.put(e.request, res.clone()));
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
    vibrate: [200, 100, 200],
  };
  e.waitUntil(self.registration.showNotification(data.title || 'Nimba People', options));
});

/* ── NOTIFICATION CLICK ── */
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.notification.data?.url || '/';
  // Validate notification URL before navigating
  if (!isAllowedURL(url) && !url.startsWith('/')) return;
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        const existing = clientList.find(c => c.url.includes(self.location.origin));
        if (existing) return existing.focus().then(c => c.navigate(url));
        return clients.openWindow(url);
      })
  );
});

/* ── SKIP WAITING (for update banner) ── */
self.addEventListener('message', e => {
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
