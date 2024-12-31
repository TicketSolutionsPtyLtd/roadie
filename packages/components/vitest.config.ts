import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'node_modules/**',
        '**/*.d.ts',
        '**/*.test.{ts,tsx}',
        '**/*.config.{ts,js}',
        '**/dist/**',
        '**/coverage/**',
        '**/roadie-core/**'
      ]
    }
  },
  resolve: {
    preserveSymlinks: true,
    alias: {
      '@oztix/roadie-core': resolve(__dirname, '../core/dist/')
    }
  }
})
