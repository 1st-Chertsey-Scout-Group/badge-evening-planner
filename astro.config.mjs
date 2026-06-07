// @ts-check
import { defineConfig } from 'astro/config'
import preact from '@astrojs/preact'
import tailwindcss from '@tailwindcss/vite'

// https://astro.build/config
export default defineConfig({
  integrations: [preact()],
  vite: {
    plugins: [tailwindcss()],
    // the islands' @jsxImportSource preact pragma needs the automatic transform
    esbuild: { jsx: 'automatic', jsxImportSource: 'preact' },
  },
})
