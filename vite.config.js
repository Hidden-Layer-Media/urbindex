import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  root: 'src',
  envDir: '../',
  publicDir: '../public',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'images/**/*'],
      manifest: {
        name: 'Urbindex',
        short_name: 'Urbindex',
        description: 'Secure Progressive Web App for urban exploration mapping',
        theme_color: '#00e5ff',
        background_color: '#080818',
        display: 'standalone',
        orientation: 'any',
        scope: '/',
        start_url: '/index.html',
        icons: [
          { src: 'images/icons/icon-96x96.png', sizes: '96x96', type: 'image/png', purpose: 'any' },
          { src: 'images/icons/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: 'images/icons/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
        shortcuts: [
          {
            name: 'Add Location',
            short_name: 'Add',
            description: 'Quickly add a new exploration location',
            url: '/index.html?action=add',
            icons: [{ src: 'images/icons/icon-96x96.png', sizes: '96x96', type: 'image/png' }]
          },
          {
            name: 'View Map',
            short_name: 'Map',
            description: 'Open the exploration map',
            url: '/index.html?view=map',
            icons: [{ src: 'images/icons/icon-96x96.png', sizes: '96x96', type: 'image/png' }]
          }
        ],
        categories: ['maps', 'social', 'lifestyle', 'navigation', 'travel'],
        share_target: {
          action: '/index.html?share',
          method: 'GET',
          params: { title: 'title', text: 'text', url: 'url' }
        }
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/[a-z].tile\.openstreetmap\.org\/.*/,
            handler: 'CacheFirst',
            options: { cacheName: 'osm-tiles', expiration: { maxEntries: 200, maxAgeSeconds: 604800 } },
          },
          {
            urlPattern: /^https:\/\/firestore\.googleapis\.com\/.*/,
            handler: 'NetworkFirst',
            options: { cacheName: 'firestore', expiration: { maxEntries: 50 } },
          },
        ],
      },
    }),
  ],
  server: {
    port: 8080,
    open: true,
  },
});
