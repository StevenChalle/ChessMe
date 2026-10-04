import { defineConfig, minimal2023Preset as preset } from '@vite-pwa/assets-generator/config'

/** Background of the logo's square (public/favicon.svg): padded icons blend with it. */
const LOGO_BACKGROUND = '#262421'

// Regenerate icons after changing public/favicon.svg: pnpm generate-pwa-assets
export default defineConfig({
  preset: {
    ...preset,
    maskable: { ...preset.maskable, resizeOptions: { background: LOGO_BACKGROUND } },
    apple: { ...preset.apple, resizeOptions: { background: LOGO_BACKGROUND } },
  },
  images: ['public/favicon.svg'],
})
