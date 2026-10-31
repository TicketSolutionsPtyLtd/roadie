import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { playwright } from '@vitest/browser-playwright'
import { fileURLToPath } from 'node:url'
import { configDefaults, defineConfig } from 'vitest/config'
import type { BrowserCommand } from 'vitest/node'

import {
  browserInstances,
  browserRetry,
  browserRunOptions,
  quarantineInclude
} from '../../vitest.browsers.config.ts'
import { reactCompilerPreset } from './react-compiler.config.ts'

const reducedMotion: BrowserCommand<[active: boolean]> = ({ page }, active) =>
  page.emulateMedia({ reducedMotion: active ? 'reduce' : 'no-preference' })

const BROWSER_TESTS = 'src/**/*.browser.test.{ts,tsx}'
const ROOT = fileURLToPath(new URL('./', import.meta.url))

export default defineConfig({
  plugins: [react(), babel({ presets: [reactCompilerPreset] })],
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
            '@oztix/roadie-components/badge',
            '@oztix/roadie-components/button',
            '@oztix/roadie-components/field',
            '@oztix/roadie-components/menu',
            '@oztix/roadie-components/popover',
            '@oztix/roadie-components/prose',
            '@oztix/roadie-components/scroll-area',
            '@oztix/roadie-components/select',
            '@oztix/roadie-components/skeleton',
            '@oztix/roadie-components/toggle',
            '@oztix/roadie-components/toolbar',
            '@oztix/roadie-components/tooltip',
            '@phosphor-icons/react',
            '@testing-library/jest-dom/vitest',
            '@testing-library/react',
            '@tiptap/core',
            '@tiptap/extension-heading',
            '@tiptap/extension-link',
            '@tiptap/extensions',
            '@tiptap/pm/model',
            '@tiptap/pm/state',
            '@tiptap/pm/view',
            '@tiptap/react',
            '@tiptap/react/menus',
            '@tiptap/starter-kit',
            'class-variance-authority',
            'react/compiler-runtime',
            'react/jsx-dev-runtime',
            'react/jsx-runtime',
            'react-dom',
            'react-dom/client',
            'react-dom/server'
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
            commands: { reducedMotion },
            instances: browserInstances
          }
        }
      }
    ]
  }
})
