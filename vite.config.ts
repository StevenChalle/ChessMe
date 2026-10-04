/// <reference types="vitest/config" />
import { paraglideVitePlugin } from '@inlang/paraglide-js'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    // Must come before react(): generates src/routeTree.gen.ts from src/routes/
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    react(),
    tailwindcss(),
    // Compiles messages/*.json into typed functions in src/paraglide (git-ignored).
    // Keep the strategy in sync with the "i18n" script in package.json.
    paraglideVitePlugin({
      project: './project.inlang',
      outdir: './src/paraglide',
      // English by default; the user's choice is saved in localStorage.
      strategy: ['localStorage', 'baseLocale'],
      emitTsDeclarations: true,
    }),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      // Lets you install a separate "ChessMe (dev)" app from `make dev` that follows HMR.
      devOptions: { enabled: true, suppressWarnings: true },
      manifest: {
        name: mode === 'development' ? 'ChessMe (dev)' : 'ChessMe',
        short_name: mode === 'development' ? 'ChessMe dev' : 'ChessMe',
        description: 'Explore your Lichess and Chess.com stats and games.',
        lang: 'en',
        theme_color: '#161512',
        background_color: '#161512',
        display: 'standalone',
        start_url: '/',
        icons: [
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
        globPatterns: ['**/*.{js,css,html,svg,png}'],
        // Font subsets are cached on first use instead of precaching every alphabet.
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === 'font',
            handler: 'CacheFirst',
            options: { cacheName: 'fonts', expiration: { maxEntries: 20 } },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
}))
