import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon.svg', 'primjeri/*.json'],
      manifest: {
        name: 'Zicer – kućni kviz dvoboj',
        short_name: 'Zicer',
        description: 'Kviz i društvene igre za dvoje na jednom uređaju.',
        lang: 'hr',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        orientation: 'any',
        background_color: '#0e0b0a',
        theme_color: '#0e0b0a',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,json,webmanifest}'],
        // Slike za „Pogodi po slici” preuzimaju se tek kad zatrebaju, a zatim ostaju spremljene.
        globIgnores: ['slike/**'],
        runtimeCaching: [
          {
            urlPattern: /\/slike\//,
            handler: 'CacheFirst',
            options: { cacheName: 'zicer-slike', expiration: { maxEntries: 600 } },
          },
        ],
        navigateFallback: 'index.html',
      },
    }),
  ],
  test: {
    environment: 'node',
  },
});
