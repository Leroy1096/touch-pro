/* Service Worker — TOUCH PRO
   Stratégie : HTML et images TOUJOURS du réseau d'abord (le client voit
   immédiatement les nouveautés), cache uniquement en secours hors-ligne.
   CSS/JS versionnés (?v=) : cache rapide + mise à jour en arrière-plan.
   Jamais d'interception : POST, Supabase (données vivantes), pages admin. */
const VERSION = "tp-v3";
const SHELL = [
  "/", "/index.html",
  "/css/touchpro.css?v=19",
  "/js/tp-config.js?v=19",
  "/images/tp/logo-officiel.jpg",
  "/manifest.webmanifest"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  // Jamais de cache : POST/PUT…, Supabase (données vivantes), espace Admin, autres hôtes
  if (e.request.method !== "GET" || url.origin !== location.origin || url.pathname.startsWith("/admin")) return;

  // Pages HTML : réseau d'abord, repli cache hors ligne
  if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request).then((resp) => {
        if (resp.ok) { const copy = resp.clone(); caches.open(VERSION).then((c) => c.put(e.request, copy)); }
        return resp;
      }).catch(() => caches.match(e.request).then((r) => r || caches.match("/index.html")))
    );
    return;
  }

  // Images : réseau d'abord (affiches/logo toujours à jour), repli cache hors ligne
  if (e.request.destination === "image") {
    e.respondWith(
      fetch(e.request).then((resp) => {
        if (resp.ok) { const copy = resp.clone(); caches.open(VERSION).then((c) => c.put(e.request, copy)); }
        return resp;
      }).catch(() => caches.match(e.request))
    );
    return;
  }

  // CSS/JS versionnés : cache d'abord, mise à jour en arrière-plan
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const network = fetch(e.request).then((resp) => {
        if (resp.ok) {
          const copy = resp.clone();
          caches.open(VERSION).then((c) => c.put(e.request, copy));
        }
        return resp;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
