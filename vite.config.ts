import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
export default defineConfig({
  base: './',
  plugins: [
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src/pwa',
      filename: 'service-worker.ts',
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['icons/*.png', 'favicon.svg'],
      injectManifest: { globPatterns: ['**/*.{js,css,html,png,svg,webmanifest}'] },
      manifest: {
        name: 'PRISM · 方块心流',
        short_name: 'PRISM',
        description: '放下杂念，落下方块。离线俄罗斯方块。',
        lang: 'zh-CN',
        start_url: './',
        scope: './',
        id: './',
        display: 'standalone',
        background_color: '#101525',
        theme_color: '#101525',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          {
            src: 'icons/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
});
