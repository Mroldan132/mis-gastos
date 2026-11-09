// Service worker de HogarApp: hace que la app instalada abra al instante y aunque no haya internet.
// Solo guarda la "cáscara" de la app (HTML, JS, CSS, íconos, fuentes). Los datos de la API nunca
// se guardan: siempre se piden frescos para no mostrar montos viejos.
const VERSION = 'hogarapp-v1';
const CASCARA = ['/', '/manifest.webmanifest', '/icon.svg', '/icon-192.png', '/icon-512.png', '/apple-touch-icon.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(CASCARA)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((claves) => Promise.all(claves.filter((c) => c !== VERSION).map((c) => caches.delete(c))))
      .then(() => self.clients.claim())
  );
});

const guardar = (request, respuesta) => {
  if (respuesta.ok || respuesta.type === 'opaque') {
    const copia = respuesta.clone();
    caches.open(VERSION).then((cache) => cache.put(request, copia));
  }
  return respuesta;
};

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  const esFuente = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';

  // API y cualquier otro dominio: directo a la red, sin caché
  if (url.origin !== self.location.origin && !esFuente) return;

  // Páginas: primero la red (para tener siempre la última versión); sin conexión, la app guardada
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).then((r) => guardar('/', r)).catch(() => caches.match('/'))
    );
    return;
  }

  // Archivos con hash (/assets/...) y fuentes: no cambian nunca, se sirven desde la caché
  if (url.pathname.startsWith('/assets/') || esFuente) {
    event.respondWith(
      caches.match(request).then((enCache) => enCache || fetch(request).then((r) => guardar(request, r)))
    );
    return;
  }

  // Íconos y demás: desde la caché al instante y se actualizan por detrás
  event.respondWith(
    caches.match(request).then((enCache) => {
      const deRed = fetch(request).then((r) => guardar(request, r)).catch(() => enCache);
      return enCache || deRed;
    })
  );
});
