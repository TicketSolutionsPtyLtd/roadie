import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { playwright } from '@vitest/browser-playwright'
import { configDefaults, defineConfig } from 'vitest/config'
import type { BrowserCommand } from 'vitest/node'

import { reactCompilerPreset } from './react-compiler.config.ts'

const BROWSER_TESTS = 'src/**/*.browser.test.{ts,tsx}'

const browsers = (process.env.ROADIE_BROWSERS ?? 'chromium,webkit,firefox')
  .split(',')
  .map((name) => name.trim())
  .filter(Boolean)

const forcedColors: BrowserCommand<[active: boolean]> = ({ page }, active) =>
  page.emulateMedia({ forcedColors: active ? 'active' : 'none' })

const reducedMotion: BrowserCommand<[active: boolean]> = ({ page }, active) =>
  page.emulateMedia({ reducedMotion: active ? 'reduce' : 'no-preference' })

const printMedia: BrowserCommand<[active: boolean]> = ({ page }, active) =>
  page.emulateMedia({ media: active ? 'print' : 'screen' })

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
    projects: [
      {
        extends: true,
        test: {
          name: 'jsdom',
          environment: 'jsdom',
          setupFiles: ['./vitest.setup.ts'],
          globals: true,
          exclude: [...configDefaults.exclude, BROWSER_TESTS]
        }
      },
      {
        extends: true,
        plugins: [tailwindcss()],
        optimizeDeps: {
          include: [
            'react',
            'react/compiler-runtime',
            'react/jsx-dev-runtime',
            'react/jsx-runtime',
            'react-dom',
            'react-dom/client',
            'react-dom/server',
            'axe-core',
            '@tanstack/charts/scales/band'
          ]
        },
        test: {
          name: 'browser',
          include: [BROWSER_TESTS],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            viewport: { width: 1920, height: 1080 },
            commands: { forcedColors, printMedia, reducedMotion },
            // Firefox pages share one window activation, so a parallel file's
            // input blurs this one mid-test and Enter then activates nothing.
            instances: browsers.map((browser) => ({
              browser,
              fileParallelism: browser !== 'firefox'
            }))
          }
        }
      }
    ]
  },
  ssr: {
    noExternal: ['@oztix/roadie-core']
  }
})
