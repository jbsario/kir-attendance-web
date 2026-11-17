// KIR Attendance service worker — lets the app open with no internet.
// Data sync is handled in the page (IndexedDB outbox); Supabase API calls are never cached here.
const V = 'kir-att-v4';
const SHELL = [
  './', './index.html', './config.js', './manifest.webmanifest', './icon.svg', './icon-192.png', './icon-512.png',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {})))));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== V && k !== 'kir-tiles').map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);

  // Live data: network only (the app queues writes itself when offline)
  if (/supabase\.(co|in)$/.test(u.hostname)) return;

  // Map tiles: cache as you view them so site maps work offline
  if (u.hostname.endsWith('tile.openstreetmap.org')) {
    e.respondWith(caches.open('kir-tiles').then(async c => {
      const hit = await c.match(r);
      const net = fetch(r).then(res => { if (res.ok) c.put(r, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    }));
    return;
  }

  // App page: network first (get updates), fall back to cached copy offline
  if (r.mode === 'navigate') {
    e.respondWith(
      fetch(r).then(res => { const cp = res.clone(); caches.open(V).then(c => c.put('./index.html', cp)); return res; })
        .catch(() => caches.match('./index.html').then(x => x || caches.match('./')))
    );
    return;
  }

  // Everything else (scripts, styles, fonts, icons): cache first, refresh in background
  e.respondWith(caches.match(r).then(hit => {
    const net = fetch(r).then(res => {
      if (res && (res.ok || res.type === 'opaque')) { const cp = res.clone(); caches.open(V).then(c => c.put(r, cp)); }
      return res;
    }).catch(() => hit);
    return hit || net;
  }));
});
