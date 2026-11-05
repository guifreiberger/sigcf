import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// Os modos app-homologacao e app-producao geram o frontend para o app Android, que não usa
// service worker: os arquivos já vêm dentro do app.
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    VitePWA({
      disable: mode.startsWith('app-'),
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'SIGCF — Gestão de Coleta e Frota',
        short_name: 'SIGCF',
        description: 'Coletas do dia e atualização de status em campo.',
        lang: 'pt-BR',
        start_url: '/',
        display: 'standalone',
        background_color: '#f5f5f3',
        theme_color: '#18181b',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        navigateFallbackDenylist: [/^\/api/],
        importScripts: ['sw-push.js'],
      },
    }),
  ],
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
}))
