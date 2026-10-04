/// <reference types="vitest/config" />
import { paraglideVitePlugin } from '@inlang/paraglide-js'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

/**
 * Serves the prebuilt Stockfish WASM engine (node_modules/stockfish/bin) under /engine/ in dev,
 * and copies it into dist/engine/ at build. The script loads the .wasm sitting next to it.
 * Keep the file name in sync with ENGINE_URL (src/lib/engine/stockfish.ts).
 */
function stockfishEngine(): Plugin {
  const files = ['stockfish-19-lite-single.js', 'stockfish-19-lite-single.wasm']
  const binDir = join(
    dirname(createRequire(import.meta.url).resolve('stockfish/package.json')),
    'bin',
  )
  const contentType = (file: string) =>
    file.endsWith('.wasm') ? 'application/wasm' : 'text/javascript'
  return {
    name: 'stockfish-engine',
    configureServer(server) {
      server.middlewares.use('/engine/', (request, response, next) => {
        const file = files.find((name) => request.url?.split('?')[0] === `/${name}`)
        if (!file) return next()
        response.setHeader('Content-Type', contentType(file))
        response.end(readFileSync(join(binDir, file)))
      })
    },
    generateBundle() {
      for (const file of files) {
        this.emitFile({
          type: 'asset',
          fileName: `engine/${file}`,
          source: readFileSync(join(binDir, file)),
        })
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    // Must come before react(): generates src/routeTree.gen.ts from src/routes/
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    react(),
    tailwindcss(),
    stockfishEngine(),
    // Compiles messages/*.json into typed functions in src/paraglide (git-ignored).
    // Keep the strategy in sync with the "i18n" script in package.json.
    paraglideVitePlugin({
      project: './project.inlang',
      outdir: './src/paraglide',
      // Saved choice first, then the browser language, then English.
      strategy: ['localStorage', 'preferredLanguage', 'baseLocale'],
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
        // The engine (~1.8 MB) is downloaded on first use only, then served from the cache.
        globIgnores: ['engine/**'],
        // Font subsets are cached on first use instead of precaching every alphabet.
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === 'font',
            handler: 'CacheFirst',
            options: { cacheName: 'fonts', expiration: { maxEntries: 20 } },
          },
          {
            urlPattern: ({ url }) => url.pathname.includes('/engine/'),
            handler: 'CacheFirst',
            options: { cacheName: 'engine', expiration: { maxEntries: 4 } },
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
