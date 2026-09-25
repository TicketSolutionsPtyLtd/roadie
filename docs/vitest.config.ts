import { fileURLToPath } from 'url'
import { defineConfig } from 'vitest/config'

// The docs' own logic, not its pages. Components are tested where they live.
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) }
  },
  oxc: { jsx: { runtime: 'automatic' } },
  test: {
    include: ['src/**/*.test.{ts,tsx}']
  }
})
