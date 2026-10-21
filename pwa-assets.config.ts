import { defineConfig, minimal2023Preset as preset } from '@vite-pwa/assets-generator/config'

/** Background of the logo (public/logo.png): padded icons blend with it. */
const LOGO_BACKGROUND = '#282421'

// Regenerate icons after changing public/logo.png: pnpm generate-pwa-assets
export default defineConfig({
  preset: {
    ...preset,
    maskable: { ...preset.maskable, resizeOptions: { background: LOGO_BACKGROUND } },
    apple: { ...preset.apple, resizeOptions: { background: LOGO_BACKGROUND } },
  },
  images: ['public/logo.png'],
})
