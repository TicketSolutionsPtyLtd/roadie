import { defineConfig } from 'vitest/config'

// Runs against the static export in `out`, so build the docs first.
export default defineConfig({
  test: {
    include: ['e2e/**/*.e2e.test.ts'],
    // Each file launches its own browser and serves the export without a
    // port, so files share nothing and can run side by side.
    maxWorkers: 3,
    // Closing a browser after a full run can outlast the 10s default.
    hookTimeout: 30_000
  }
})
