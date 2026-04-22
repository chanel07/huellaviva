
// ¡LA LÍNEA MÁGICA! Importa el motor de OneSignal para que nuestro Service Worker lo controle.
importScripts('https://cdn.onesignal.com/sdks/OneSignalSDK.js');

const CACHE_NAME = 'huellaviva-v4'; // Nueva versión para forzar la actualización
const urlsToCache = [
  '/',
  '/index.html',
  '/admin.html',
  '/manifest.json',
  '/icono-192.png',
  '/icono-512.png'
];

// Evento de instalación: sigue guardando nuestros archivos para el modo offline.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache v4 abierto, guardando archivos de la app.');
        return cache.addAll(urlsToCache);
      })
  );
});

// Evento fetch: sigue respondiendo desde el caché.
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});

// Evento de activación para limpiar cachés viejos.
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
