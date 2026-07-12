import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'

// Activa inmediatamente y toma control de todos los clientes
self.skipWaiting()
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()))

cleanupOutdatedCaches()

// Solo precachea assets propios — NO intercepta ningún request externo
precacheAndRoute(self.__WB_MANIFEST)
