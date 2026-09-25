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

const reduceMotion: BrowserCommand<[reduce: boolean]> = ({ page }, reduce) =>
  page.emulateMedia({ reducedMotion: reduce ? 'reduce' : 'no-preference' })

const forcedColors: BrowserCommand<[active: boolean]> = ({ page }, active) =>
  page.emulateMedia({ forcedColors: active ? 'active' : 'none' })

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
          exclude: [...configDefaults.exclude, BROWSER_TESTS],
          // Stubbed CSS would make a `?raw` import of this sheet empty.
          css: { include: [/navigator-pending\.css/] }
        }
      },
      {
        extends: true,
        plugins: [tailwindcss()],
        optimizeDeps: {
          include: [
            '@base-ui/react/toast',
            'jsqr',
            'react',
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
          include: [BROWSER_TESTS],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            viewport: { width: 1920, height: 1080 },
            commands: { reduceMotion, forcedColors },
            instances: browsers.map((browser) => ({ browser }))
          }
        }
      }
    ]
  },
  ssr: {
    noExternal: ['@oztix/roadie-core']
  }
})
