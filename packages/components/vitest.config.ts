import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { playwright } from '@vitest/browser-playwright'
import { globSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { configDefaults, defineConfig } from 'vitest/config'
import type { BrowserCommand } from 'vitest/node'

import { browserInstances } from '../../vitest.browsers.config.ts'
import { reactCompilerPreset } from './react-compiler.config.ts'

const BROWSER_TESTS = 'src/**/*.browser.test.{ts,tsx}'
const TOUCH_TESTS = 'src/**/*.touch.browser.test.{ts,tsx}'

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

const reduceMotion: BrowserCommand<[reduce: boolean]> = ({ page }, reduce) =>
  page.emulateMedia({ reducedMotion: reduce ? 'reduce' : 'no-preference' })

const forcedColors: BrowserCommand<[active: boolean]> = ({ page }, active) =>
  page.emulateMedia({ forcedColors: active ? 'active' : 'none' })

// The pointer stays wherever the last test file on the page left it, so a
// test that needs nothing hovered parks it in the top-left corner first.
const parkPointer: BrowserCommand<[]> = ({ page }) => page.mouse.move(0, 0)

type PointerStep =
  | { type: 'move'; x: number; y: number; steps?: number }
  | { type: 'down' }
  | { type: 'up' }
  | { type: 'wait'; ms: number }

// A real mouse, so the browser runs its own native drag and drop. Points are
// in the test frame's CSS pixels; the frame may sit offset and scaled.
const pointer: BrowserCommand<[steps: PointerStep[]]> = async (
  { page, frame },
  steps
) => {
  const testFrame = await frame()
  const box = await (await testFrame.frameElement()).boundingBox()
  if (!box) throw new Error('The test frame has no box')
  const width = await testFrame.evaluate(() => window.innerWidth)
  const scale = box.width / width
  for (const step of steps) {
    if (step.type === 'move')
      await page.mouse.move(box.x + step.x * scale, box.y + step.y * scale, {
        steps: step.steps ?? 1
      })
    else if (step.type === 'down') await page.mouse.down()
    else if (step.type === 'up') await page.mouse.up()
    else await page.waitForTimeout(step.ms)
  }
}

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

// A finger drag from one point to another, for touch scrolling. Chromium
// only, through the DevTools protocol: a test skips it in other engines.
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

const browserTest = {
  enabled: true,
  headless: true,
  viewport: { width: 1920, height: 1080 },
  commands: { reduceMotion, forcedColors, parkPointer, pointer, tap, swipe }
}

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
        optimizeDeps,
        test: {
          name: 'browser',
          include: [BROWSER_TESTS],
          exclude: [...configDefaults.exclude, TOUCH_TESTS],
          browser: {
            ...browserTest,
            provider: playwright(),
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
          include: [TOUCH_TESTS],
          browser: {
            ...browserTest,
            provider: playwright({ contextOptions: { hasTouch: true } }),
            // Firefox has no touch emulation, and Linux WebKit in CI doesn't
            // deliver these emulated taps reliably, so WebKit runs them locally.
            // Copies: Vitest names each instance in place, after its project.
            instances: browserInstances
              .filter(
                ({ browser }) =>
                  browser !== 'firefox' &&
                  !(process.env.CI && browser === 'webkit')
              )
              .map((instance) => ({ ...instance }))
          }
        }
      }
    ]
  },
  ssr: {
    noExternal: ['@oztix/roadie-core']
  }
})
