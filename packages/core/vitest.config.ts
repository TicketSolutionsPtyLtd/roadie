import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    // The root has no test runner, so core runs the lint plugin's and the
    // plugin codemods' tests.
    include: [
      '**/*.test.{ts,tsx}',
      '../../eslint/**/*.test.js',
      '../../skills/*/codemods/**/*.test.js'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: [
        'node_modules/**',
        '**/*.d.ts',
        '**/*.test.{ts,tsx}',
        '**/*.config.{ts,js}',
        '**/dist/**',
        '**/coverage/**'
      ]
    }
  }
})
