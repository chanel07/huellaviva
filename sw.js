const CACHE_NAME = 'huellaviva-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/admin.html', // Añadimos admin.html por si acaso
  '/manifest.json',
  '/icono-192.png',
  '/icono-512.png'
];

// Evento de instalación: abre el caché y guarda los archivos principales
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache abierto');
        return cache.addAll(urlsToCache);
      })
  );
});

// Evento fetch: responde desde el caché si es posible
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Si encontramos una respuesta en el caché, la devolvemos
        if (response) {
          return response;
        }
        // Si no, intentamos obtenerla de la red
        return fetch(event.request);
      })
  );
});
