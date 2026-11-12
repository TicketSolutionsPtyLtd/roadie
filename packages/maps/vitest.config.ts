import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { playwright } from '@vitest/browser-playwright'
import { globSync, readFileSync, realpathSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { configDefaults, defineConfig } from 'vitest/config'
import type { BrowserCommand } from 'vitest/node'

import {
  frameCommands,
  perfInstances,
  perfLaunchOptions
} from '@oztix/roadie-frames/config'

import {
  browserInstances,
  browserRetry,
  browserRunOptions,
  quarantineInclude
} from '../../vitest.browsers.config.ts'
import { reactCompilerPreset } from './react-compiler.config.ts'

const BROWSER_TESTS = 'src/**/*.browser.test.{ts,tsx}'
const PERF_TESTS = 'src/**/*.perf.browser.test.{ts,tsx}'
const TOUCH_TESTS = 'src/**/*.touch.browser.test.{ts,tsx}'

// Reduced motion, as the reader's system setting.
const reduceMotion: BrowserCommand<[reduce: boolean]> = ({ page }, reduce) =>
  page.emulateMedia({ reducedMotion: reduce ? 'reduce' : 'no-preference' })

// A real touch tap, which the engine turns into pointer, touch and mouse
// events as a phone does. Needs a context with touch.
const tap: BrowserCommand<[x: number, y: number]> = async (
  { page, frame },
  x,
  y
) => {
  const testFrame = await frame()
  const box = await (await testFrame.frameElement()).boundingBox()
  if (!box) throw new Error('The test frame has no box')
  const width = await testFrame.evaluate(() => window.innerWidth)
  const scale = box.width / width
  await page.touchscreen.tap(box.x + x * scale, box.y + y * scale)
}

// A finger drag, as real touch events. Points are in the test frame's CSS
// pixels; the frame may sit offset and scaled. Chromium only.
const swipe: BrowserCommand<
  [
    from: { x: number; y: number },
    to: { x: number; y: number },
    options?: { holdMs?: number }
  ]
> = async ({ page, frame }, from, to, options) => {
  const testFrame = await frame()
  const box = await (await testFrame.frameElement()).boundingBox()
  if (!box) throw new Error('The test frame has no box')
  const width = await testFrame.evaluate(() => window.innerWidth)
  const scale = box.width / width
  const point = ({ x, y }: { x: number; y: number }) => ({
    x: box.x + x * scale,
    y: box.y + y * scale
  })
  const session = await page.context().newCDPSession(page)
  const send = (type: string, points: { x: number; y: number }[]) =>
    session.send('Input.dispatchTouchEvent', { type, touchPoints: points })
  await send('touchStart', [point(from)])
  for (let step = 1; step <= 10; step++)
    await send('touchMove', [
      point({
        x: from.x + ((to.x - from.x) * step) / 10,
        y: from.y + ((to.y - from.y) * step) / 10
      })
    ])
  if (options?.holdMs) await page.waitForTimeout(options.holdMs)
  await send('touchEnd', [])
  await session.detach()
}

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

const commands = { reduceMotion, tap, swipe }

const optimizeDeps = {
  include: [
    ...importedPackages(),
    // Imported by the JSX transforms and test libraries, not the source.
    'react/compiler-runtime',
    'react/jsx-dev-runtime',
    'react/jsx-runtime',
    'react-dom'
  ]
}

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
        optimizeDeps,
        test: {
          name: 'browser',
          include: quarantineInclude(ROOT, [BROWSER_TESTS]),
          exclude: [...configDefaults.exclude, PERF_TESTS, TOUCH_TESTS],
          retry: browserRetry,
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            viewport: { width: 1920, height: 1080 },
            commands,
            // Copies: Vitest names each instance in place, after its project.
            instances: browserInstances.map((instance) => ({ ...instance }))
          }
        }
      },
      {
        extends: true,
        plugins: [tailwindcss()],
        optimizeDeps,
        test: {
          name: 'browser touch',
          include: quarantineInclude(ROOT, [TOUCH_TESTS]),
          retry: browserRetry,
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({ contextOptions: { hasTouch: true } }),
            viewport: { width: 1920, height: 1080 },
            commands,
            // Firefox has no touch emulation, and Linux WebKit in CI doesn't
            // deliver these emulated taps reliably, so WebKit runs them locally.
            instances: browserInstances
              .filter(
                ({ browser }) =>
                  browser !== 'firefox' &&
                  !(process.env.CI && browser === 'webkit')
              )
              .map((instance) => ({ ...instance }))
          }
        }
      },
      {
        extends: true,
        plugins: [tailwindcss()],
        optimizeDeps: { ...optimizeDeps, force: true },
        test: {
          name: 'perf',
          include: [PERF_TESTS],
          // Files measured side by side would slow each other down.
          fileParallelism: false,
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({ launchOptions: perfLaunchOptions() }),
            viewport: { width: 1440, height: 900 },
            commands: { ...commands, ...frameCommands },
            instances: perfInstances()
          }
        }
      }
    ]
  },
  ssr: {
    noExternal: ['@oztix/roadie-core']
  }
})
