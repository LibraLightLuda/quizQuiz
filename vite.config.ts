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
          name: '어린이 학습 놀이터',
          short_name: '학습 놀이터',
          description: '수학, 한국어, 영어, 기억력 챌린지와 스도쿠를 즐겁게 배우는 어린이 학습 앱',
          theme_color: '#5b4ae8',
          background_color: '#f7f7ff',
          display: 'standalone',
          orientation: 'any',
          scope: base,
          start_url: base,
          lang: 'ko-KR',
          icons: [
            { src: `${base}icons/icon-192.png`, sizes: '192x192', type: 'image/png' },
            { src: `${base}icons/icon-512.png`, sizes: '512x512', type: 'image/png' },
            { src: `${base}icons/icon-maskable-512.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' }
          ]
        },
        workbox: {
          cleanupOutdatedCaches: true,
          navigateFallback: `${base}index.html`,
          globPatterns: ['**/*.{js,css,html,png,webmanifest}']
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
