import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import vue from '@vitejs/plugin-vue'
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

const BROWSER_TESTS = 'src/**/*.browser.test.{ts,tsx}'
const ROOT = fileURLToPath(new URL('./', import.meta.url))

export default defineConfig({
  plugins: [react(), vue()],
  resolve: { dedupe: ['react', 'react-dom', 'vue'] },
  server: { fs: { allow: ['../..'] } },
  test: {
    ...browserRunOptions,
    sequence: { sequencer: sizeBalanced(BaseSequencer) },
    globals: true,
    projects: [
      {
        extends: true,
        test: {
          name: 'jsdom',
          environment: 'jsdom',
          setupFiles: ['./vitest.setup.ts'],
          exclude: [...configDefaults.exclude, BROWSER_TESTS],
          // React + Base UI Popover transitions + async refetch run slowly in jsdom;
          // the heavier cart-drawer flows brush past the 5s default on slower CI
          // runners (locally ~3-5s). 15s gives headroom without masking a real hang.
          testTimeout: 15000
        }
      },
      {
        extends: true,
        plugins: [tailwindcss()],
        optimizeDeps: {
          include: [
            '@number-flow/react',
            '@number-flow/vue',
            '@phosphor-icons/react',
            '@phosphor-icons/vue',
            '@tanstack/react-query',
            '@testing-library/jest-dom/vitest',
            '@testing-library/react',
            '@testing-library/vue',
            'focus-trap',
            'motion',
            'motion/react',
            'react-dom',
            'react-dom/client',
            'react-focus-lock',
            'react/jsx-dev-runtime',
            'react/jsx-runtime',
            'vue'
          ]
        },
        test: {
          name: 'browser',
          include: quarantineInclude(ROOT, [BROWSER_TESTS]),
          setupFiles: ['@testing-library/jest-dom/vitest'],
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
  },
  ssr: { noExternal: ['@oztix/roadie-core'] }
})
