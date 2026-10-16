/* ==========================================================================
   Jasseks GameNight – Service Worker
   Sorgt dafür, dass die App offline startet.

   WICHTIG: Wenn du eine Datei änderst (z. B. config.js), zähl hier die
   VERSION hoch. Dann zeigt die installierte App „Neue Version verfügbar“.
   ========================================================================== */
const VERSION = 'gamenight-v1.3.0';
const RUNTIME = 'gamenight-runtime';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './config.js',
  './hol-data.js',
  './hol-custom.js',
  './bluff-data.js',
  './bluff-custom.js',
  './app.js',
  './sync.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSION).then((cache) => cache.addAll(ASSETS.map((url) => new Request(url, { cache: 'reload' }))))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION && k !== RUNTIME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Live-Daten von Firebase nie zwischenspeichern
  if (/firebaseio\.com$|firebasedatabase\.app$/.test(url.hostname)) return;

  if (url.origin === self.location.origin) {
    if (req.mode === 'navigate') {
      event.respondWith(caches.match('./index.html').then((hit) => hit || fetch(req)));
      return;
    }
    event.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req)));
    return;
  }

  // Schriften und Firebase-Bibliothek: aus dem Cache, im Hintergrund auffrischen
  if (/^(fonts\.googleapis\.com|fonts\.gstatic\.com|www\.gstatic\.com)$/.test(url.hostname)) {
    event.respondWith(
      caches.open(RUNTIME).then(async (cache) => {
        const hit = await cache.match(req);
        const net = fetch(req)
          .then((res) => { if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone()); return res; })
          .catch(() => hit);
        return hit || net;
      })
    );
  }
});
