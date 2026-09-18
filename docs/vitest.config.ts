import { defineConfig } from 'vitest/config'

// The docs' own logic, not its pages. Components are tested where they live.
export default defineConfig({
  test: {
    include: ['src/**/*.test.{ts,tsx}']
  }
})
