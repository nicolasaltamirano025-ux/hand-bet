import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { NetworkOnly, CacheFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'

cleanupOutdatedCaches()

// Activa el nuevo SW inmediatamente sin esperar a que se cierren las pestañas
self.skipWaiting()
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()))

// Precaché de assets de la app
precacheAndRoute(self.__WB_MANIFEST)

// Cualquier request cross-origin (Firebase Auth, Database, Google APIs, etc.) → siempre red
registerRoute(
  ({ url }) => url.origin !== self.location.origin,
  new NetworkOnly()
)

// Google Fonts CSS → cache
registerRoute(
  /^https:\/\/fonts\.googleapis\.com\/.*/i,
  new CacheFirst({
    cacheName: 'google-fonts-cache',
    plugins: [new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 })],
  })
)

// Google Fonts archivos → cache
registerRoute(
  /^https:\/\/fonts\.gstatic\.com\/.*/i,
  new CacheFirst({
    cacheName: 'gstatic-fonts-cache',
    plugins: [new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 })],
  })
)
