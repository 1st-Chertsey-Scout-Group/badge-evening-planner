/// <reference types="vitest/config" />
import { getViteConfig } from 'astro/config'

// getViteConfig loads the Astro config so tests share its resolve aliases
// (e.g. @/*) and content setup.
export default getViteConfig({
  test: {},
})
