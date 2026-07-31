import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.svg',
        'apple-touch-icon.png',
        'robots.txt',
        'og.png',
      ],
      manifest: {
        name: 'Personal Dashboard',
        short_name: 'Dashboard',
        description:
          'Đồng hồ, thời tiết, lịch âm dương, to-do, Pomodoro, thói quen, ghi chú, bookmark và nhạc lo-fi.',
        // App mặc định tiếng Việt — manifest ghi 'en' là sai.
        lang: 'vi',
        theme_color: '#0f172a',
        background_color: '#020617',
        display: 'standalone',
        start_url: '/',
        // Icon PNG thật, và `maskable` là file RIÊNG có vùng an toàn: dùng chung
        // một ảnh cho cả `any` và `maskable` thì Android crop mất góc, còn SVG
        // thì Chrome không nhận làm maskable.
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          {
            src: 'pwa-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        shortcuts: [
          {
            name: 'Chế độ tập trung',
            short_name: 'Tập trung',
            url: '/?action=focus',
          },
          { name: 'Thêm việc', short_name: 'Thêm việc', url: '/?action=add' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        runtimeCaching: [
          {
            // Thời tiết: hiện ngay dữ liệu đã cache rồi mới cập nhật -> mở app
            // khi offline vẫn có số liệu thay vì báo lỗi.
            urlPattern: /^https:\/\/api\.open-meteo\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'open-meteo',
              expiration: { maxEntries: 32, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/www\.google\.com\/s2\/favicons.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'favicons',
              expiration: { maxEntries: 64, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/i\.ytimg\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'yt-thumbs',
              expiration: { maxEntries: 64, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
})
