// Service Worker der Vorschau. Liefert nur Dateien aus dem Cache `zdl-vorschau`, nie aus dem Netz.
importScripts('./handler.js');

self.addEventListener('install', function (event) {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', function (event) {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', function (event) {
  var scope = self.registration.scope;
  if (!self.zdlPreview.inScope(event.request.url, scope)) return;
  event.respondWith(
    caches.open('zdl-vorschau').then(function (cache) {
      return self.zdlPreview.respond(event.request, scope, cache);
    }).then(function (res) {
      return res || fetch(event.request);
    })
  );
});
