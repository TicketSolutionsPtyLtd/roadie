import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { playwright } from '@vitest/browser-playwright'
import { globSync, readFileSync, realpathSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { configDefaults, defineConfig } from 'vitest/config'

import { reactCompilerPreset } from './react-compiler.config.ts'

const BROWSER_TESTS = 'src/**/*.browser.test.{ts,tsx}'

const ROOT = fileURLToPath(new URL('./', import.meta.url))
const JSDOM_ONLY = /(?<!\.browser)\.test\.tsx?$/
const SOURCE_IMPORT = /^import(?!\s+type\s)[^'"]*['"]([^'"]+)['"]/gm
const BUILT_IMPORT = /\b(?:import|from)\s*['"]([^'"]+)['"]/g

// Vite reuses a warm dependency cache without rescanning, so a package the
// tests start reaching after a merge is optimised mid-run and the page reloads
// with a second React. The cache is keyed on this list, so every package
// reached goes in it, including those only the built Roadie packages import,
// and a new one rebuilds the cache up front.
function importedPackages() {
  const packages = new Set<string>()
  const visited = new Set<string>()

  function add(specifier: string, packageDir: string, chain: string[]) {
    if (/^node:|^vitest\b/.test(specifier)) return
    if (!specifier.startsWith('@oztix/')) {
      packages.add([...chain, specifier].join(' > '))
      return
    }
    const name = specifier.split('/').slice(0, 2).join('/')
    const dir = realpathSync(join(packageDir, 'node_modules', name))
    const { exports } = JSON.parse(
      readFileSync(join(dir, 'package.json'), 'utf8')
    )
    const entry = exports[`.${specifier.slice(name.length)}`]?.import
    if (entry) visitBuilt(join(dir, entry), dir, [...chain, name])
  }

  function visitBuilt(file: string, packageDir: string, chain: string[]) {
    if (visited.has(file)) return
    visited.add(file)
    for (const [, specifier] of readFileSync(file, 'utf8').matchAll(
      BUILT_IMPORT
    ))
      if (specifier.startsWith('.'))
        visitBuilt(resolve(dirname(file), specifier), packageDir, chain)
      else add(specifier, packageDir, chain)
  }

  for (const file of globSync('src/**/*.{ts,tsx}', { cwd: ROOT })) {
    if (JSDOM_ONLY.test(file)) continue
    for (const [, specifier] of readFileSync(join(ROOT, file), 'utf8').matchAll(
      SOURCE_IMPORT
    ))
      if (!specifier.startsWith('.')) add(specifier, ROOT, [])
  }
  return [...packages]
}

const browsers = (process.env.ROADIE_BROWSERS ?? 'chromium,webkit,firefox')
  .split(',')
  .map((name) => name.trim())
  .filter(Boolean)

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
