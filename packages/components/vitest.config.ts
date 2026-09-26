import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { playwright } from '@vitest/browser-playwright'
import { globSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { configDefaults, defineConfig } from 'vitest/config'
import type { BrowserCommand } from 'vitest/node'

import { reactCompilerPreset } from './react-compiler.config.ts'

const BROWSER_TESTS = 'src/**/*.browser.test.{ts,tsx}'

const SRC = new URL('./src/', import.meta.url)
const JSDOM_ONLY = /(?<!\.browser)\.test\.tsx?$/

// Vite reuses a warm dependency cache without rescanning, so a package the
// source starts importing after a merge is optimised mid-run and the page
// reloads with a second React. The cache is keyed on this list, so every
// imported package goes in it and a new import rebuilds the cache up front.
function importedPackages() {
  const packages = new Set<string>()
  for (const file of globSync('**/*.{ts,tsx}', { cwd: fileURLToPath(SRC) })) {
    if (JSDOM_ONLY.test(file)) continue
    const source = readFileSync(new URL(file, SRC), 'utf8')
    for (const [, specifier] of source.matchAll(
      /^import(?!\s+type\s)[^'"]*['"]([^'"]+)['"]/gm
    ))
      if (!/^[./]|^@oztix\/|^vitest\b/.test(specifier)) packages.add(specifier)
  }
  return [...packages]
}

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
            ...importedPackages(),
            // Imported by the JSX transforms and test libraries, not the source.
            'react/compiler-runtime',
            'react/jsx-dev-runtime',
            'react/jsx-runtime',
            'react-dom'
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
            // Firefox pages share one active window, so a file that focuses its
            // page blurs the files running beside it, and their keys and
            // :focus-visible stop working. Its files run one at a time.
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
