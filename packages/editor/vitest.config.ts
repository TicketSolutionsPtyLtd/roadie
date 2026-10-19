import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { playwright } from '@vitest/browser-playwright'
import { fileURLToPath } from 'node:url'
import { configDefaults, defineConfig } from 'vitest/config'

import {
  browserInstances,
  browserRetry,
  browserRunOptions,
  quarantineInclude
} from '../../vitest.browsers.config.ts'

const BROWSER_TESTS = 'src/**/*.browser.test.{ts,tsx}'
const ROOT = fileURLToPath(new URL('./', import.meta.url))

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom']
  },
  server: {
    fs: {
      allow: ['../..']
    }
  },
  test: {
    ...browserRunOptions,
    globals: true,
    projects: [
      {
        extends: true,
        test: {
          name: 'node',
          environment: 'node',
          exclude: [...configDefaults.exclude, BROWSER_TESTS]
        }
      },
      {
        extends: true,
        plugins: [tailwindcss()],
        optimizeDeps: {
          include: [
            '@oztix/roadie-components/link',
            '@oztix/roadie-components/prose',
            '@testing-library/jest-dom/vitest',
            '@testing-library/react',
            '@tiptap/core',
            '@tiptap/static-renderer/json/react',
            'react/jsx-dev-runtime',
            'react/jsx-runtime',
            'react-dom',
            'react-dom/client'
          ]
        },
        test: {
          name: 'browser',
          include: quarantineInclude(ROOT, [BROWSER_TESTS]),
          setupFiles: ['./vitest.setup.ts'],
          retry: browserRetry,
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            viewport: { width: 1280, height: 800 },
            instances: browserInstances
          }
        }
      }
    ]
  }
})
