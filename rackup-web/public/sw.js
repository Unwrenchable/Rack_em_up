/* Minimal service worker so Chromium can treat RackUp as installable.
 * Does not intercept fetches — no stale-cache risk for the SPA. */
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
