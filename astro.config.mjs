// @ts-check
import { defineConfig } from 'astro/config'
import preact from '@astrojs/preact'
import sitemap from '@astrojs/sitemap'
import tailwindcss from '@tailwindcss/vite'

// https://astro.build/config
export default defineConfig({
  // override per deploy (e.g. SITE_URL in the Coolify dashboard)
  site: process.env.SITE_URL ?? 'https://badge-evening-planner.example',
  integrations: [preact(), sitemap()],
  vite: {
    plugins: [tailwindcss()],
    // the islands' @jsxImportSource preact pragma needs the automatic transform
    esbuild: { jsx: 'automatic', jsxImportSource: 'preact' },
  },
})
