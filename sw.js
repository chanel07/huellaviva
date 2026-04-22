const CACHE_NAME = 'huellaviva-v3'; // Versión 3 para forzar la actualización
const urlsToCache = [
  '/',
  '/index.html',
  '/admin.html', // ¡Lo dejamos aquí porque ya confirmamos que funciona!
  '/manifest.json',
  '/icono-192.png',
  '/icono-512.png'
];

// Evento de instalación
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache abierto, guardando archivos para la v3.');
        return cache.addAll(urlsToCache);
      })
  );
});

// Evento fetch
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});

// Evento de activación para limpiar cachés viejos
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
