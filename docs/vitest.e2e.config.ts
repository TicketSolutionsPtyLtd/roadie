import { defineConfig } from 'vitest/config'

// Runs against the static export in `out`, so build the docs first.
export default defineConfig({
  test: {
    include: ['e2e/**/*.e2e.test.ts'],
    fileParallelism: false,
    // Closing a browser after a full run can outlast the 10s default.
    hookTimeout: 30_000
  }
})
