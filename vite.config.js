import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts-cache', expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'gstatic-fonts-cache', expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
          // Firebase — siempre va a la red, nunca al caché
          { urlPattern: /^https:\/\/identitytoolkit\.googleapis\.com\/.*/i, handler: 'NetworkOnly' },
          { urlPattern: /^https:\/\/securetoken\.googleapis\.com\/.*/i,     handler: 'NetworkOnly' },
          { urlPattern: /^https:\/\/.*\.firebaseio\.com\/.*/i,              handler: 'NetworkOnly' },
          { urlPattern: /^https:\/\/.*\.firebasedatabase\.app\/.*/i,        handler: 'NetworkOnly' },
          { urlPattern: /^https:\/\/.*\.firebaseapp\.com\/.*/i,             handler: 'NetworkOnly' },
        ],
      },
      manifest: {
        name: 'Hand Bet',
        short_name: 'Hand Bet',
        description: 'Apuestas de golf entre amigos',
        start_url: '/',
        display: 'standalone',
        background_color: '#0F1A14',
        theme_color: '#0F1A14',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
  server: {
    port: process.env.PORT ? Number(process.env.PORT) : 5173,
    strictPort: false,
  },
})
