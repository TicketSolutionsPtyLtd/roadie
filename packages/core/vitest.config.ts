import { playwright } from '@vitest/browser-playwright'
import { fileURLToPath } from 'node:url'
import { configDefaults, defineConfig } from 'vitest/config'
import { BaseSequencer } from 'vitest/node'

import {
  browserInstances,
  browserRetry,
  browserRunOptions,
  quarantineInclude,
  sizeBalanced
} from '../../vitest.browsers.config.ts'

// Core's logic is framework-agnostic, so a browser test is for what only an
// engine can do, such as drawing to a canvas and encoding the result.
const BROWSER_TESTS = 'src/**/*.browser.test.ts'
const ROOT = fileURLToPath(new URL('./', import.meta.url))

export default defineConfig({
  test: {
    ...browserRunOptions,
    sequence: { sequencer: sizeBalanced(BaseSequencer) },
    globals: true,
    projects: [
      {
        extends: true,
        test: {
          name: 'node',
          // The root has no test runner, so core runs the lint plugin's, the
          // plugin codemods', and the audit patterns' tests.
          include: [
            '**/*.test.{ts,tsx}',
            '../../eslint/**/*.test.js',
            '../../skills/*/codemods/**/*.test.js',
            '../../skills/audit/*.test.js'
          ],
          exclude: [...configDefaults.exclude, BROWSER_TESTS]
        }
      },
      {
        extends: true,
        test: {
          name: 'browser',
          include: quarantineInclude(ROOT, [BROWSER_TESTS]),
          retry: browserRetry,
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            // Copies: Vitest names each instance in place, after its project.
            instances: browserInstances.map((instance) => ({ ...instance }))
          }
        }
      }
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
