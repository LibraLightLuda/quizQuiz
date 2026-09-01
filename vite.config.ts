import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const rawBase = env.VITE_BASE_PATH || '/';
  const base = rawBase.endsWith('/') ? rawBase : `${rawBase}/`;

  return {
    base,
    plugins: [
      react(),
      VitePWA({
        registerType: 'prompt',
        manifest: {
          name: 'NumberCal Learning Playground',
          short_name: 'NumberCal',
          description: 'A daily learning app for children with math, Korean, English, stories, memory, logic, number paths, block puzzles, and Sudoku.',
          theme_color: '#5b4ae8',
          background_color: '#f7f7ff',
          display: 'standalone',
          orientation: 'any',
          scope: base,
          start_url: base,
          lang: 'en',
          icons: [
            { src: `${base}icons/icon-192.png`, sizes: '192x192', type: 'image/png' },
            { src: `${base}icons/icon-512.png`, sizes: '512x512', type: 'image/png' },
            { src: `${base}icons/icon-maskable-512.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' }
          ]
        },
        workbox: {
          cleanupOutdatedCaches: true,
          navigateFallback: `${base}index.html`,
          globPatterns: ['**/*.{js,css,html,webmanifest}', 'icons/*.png', 'illustrations/characters/*.webp', 'illustrations/ui/*.webp', 'illustrations/number-path/*.webp', 'illustrations/stories/covers/*.webp'],
          additionalManifestEntries: [1, 2, 3].map((scene) => ({
            url: `${base}illustrations/stories/sprout-rain-umbrella/scene-${scene}.webp`,
            revision: null
          })),
          runtimeCaching: [{
            urlPattern: /\/illustrations\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'learning-illustrations-v1',
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 180, maxAgeSeconds: 60 * 60 * 24 * 90 }
            }
          }]
        }
      })
    ],
    test: {
      environment: 'jsdom',
      include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
      css: true
    }
  };
});
