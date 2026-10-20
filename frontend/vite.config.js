import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),

    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',

      // ── Use our static manifest file instead of generated one ──
      // The manifest.webmanifest is in public/ and served as-is.
      // We disable manifest injection here to avoid the Rolldown issue.
      manifest: false,
      injectManifest: {
        swSrc: undefined,
      },

      // ── Workbox service worker ─────────────────────────────────
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,webmanifest}'],

        runtimeCaching: [
          // API — network first, fall back to cache
          {
            urlPattern: /^https?:\/\/.*\/api\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 8,
              expiration: { maxEntries: 50, maxAgeSeconds: 5 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Firebase Storage images — cache first
          {
            urlPattern: /^https:\/\/storage\.googleapis\.com\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'soil-images-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 30 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Google Fonts
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\//,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 365 * 24 * 60 * 60 },
            },
          },
          // OpenStreetMap tiles for offline map
          {
            urlPattern: /^https:\/\/[abc]\.tile\.openstreetmap\.org\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'map-tiles-cache',
              expiration: { maxEntries: 500, maxAgeSeconds: 7 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],

        navigateFallback: '/offline.html',
        navigateFallbackDenylist: [/^\/api\//],
        skipWaiting: true,
        clientsClaim: true,
      },

      devOptions: {
        enabled: false,   // Disable PWA in dev — avoids stale SW issues during development
        type: 'module',
      },
    }),
  ],

  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
    },
  },

  build: {
    outDir: 'dist',
    sourcemap: true,
    chunkSizeWarningLimit: 1000,
  },
});
