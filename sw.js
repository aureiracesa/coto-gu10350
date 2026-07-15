/* Service worker del Coto GU-10.350 — permite abrir la app sin cobertura */
const CACHE = "coto-gu10350-v1";
const SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "https://www.gstatic.com/firebasejs/12.14.0/firebase-app-compat.js",
  "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore-compat.js",
  "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth-compat.js",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.allSettled(SHELL.map(u => c.add(u).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // No tocar Firestore/Firebase (gestiona su propio offline), tiles de mapa ni Overpass
  if (/firestore\.googleapis|firebaseio|identitytoolkit|securetoken|firebaseinstallations/.test(url.href)) return;
  if (/arcgisonline\.com|tile\.openstreetmap|overpass/.test(url.href)) return;

  const esApp = url.origin === location.origin;
  const esCDN = /gstatic\.com|unpkg\.com/.test(url.href);
  if (!esApp && !esCDN) return;

  // App y librerías: primero caché, luego red (y refresca caché)
  e.respondWith(
    caches.match(req).then(hit => {
      const net = fetch(req).then(resp => {
        if (resp && resp.status === 200) {
          const copy = resp.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        }
        return resp;
      }).catch(() => hit || (esApp ? caches.match("./index.html") : undefined));
      return hit || net;
    })
  );
});
