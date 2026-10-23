import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/**/*.test.js', 'test/**/*.test.js'],
    // roadie/canonical-class loads Tailwind's design system on its first
    // class, about a second here and five on a CI runner, and every oxlint
    // run in a consumer test is a new process that loads it again.
    testTimeout: 30_000
  }
})
