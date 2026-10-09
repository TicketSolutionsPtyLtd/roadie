import { readFile } from 'fs/promises'
import { createRequire } from 'module'
import { dirname, join, resolve } from 'path'
import { type Browser, chromium, firefox, webkit } from 'playwright'
import { compile } from 'tailwindcss'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import { BASE_PATH, ORIGIN, serveExport } from './serveExport'

let browser: Browser

beforeAll(async () => {
  const engines = { chromium, firefox, webkit }
  const engine = (process.env.E2E_BROWSER ?? 'chromium') as keyof typeof engines
  browser = await engines[engine].launch()
})

afterAll(async () => {
  await browser?.close()
})

afterEach(async () => {
  await Promise.all(browser.contexts().map((context) => context.close()))
})

async function open(width: number) {
  const context = await browser.newContext({ viewport: { width, height: 900 } })
  await serveExport(context)
  const page = await context.newPage()
  await page.goto(`${ORIGIN}${BASE_PATH}/foundations/layout/`)
  await page.waitForLoadState('networkidle')
  return page
}

const STEPS = [0, 0.5, 1, 1.5, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24]
const BREAKPOINTS = ['sm', 'md', 'lg', 'xl', '2xl']
const CONTAINERS = [
  '3xs',
  '2xs',
  'xs',
  'sm',
  'md',
  'lg',
  'xl',
  '2xl',
  '3xl',
  '4xl',
  '5xl',
  '6xl',
  '7xl',
  '8xl'
]

/**
 * What Tailwind compiles each theme variable to with Roadie's CSS. The docs
 * build only emits the variables it uses, so the page's own CSS can't say.
 */
async function compiledTheme(variables: string[]) {
  const loadStylesheet = async (id: string, base: string) => {
    const path = id.startsWith('.')
      ? resolve(base, id)
      : createRequire(join(base, 'noop.js')).resolve(
          id === 'tailwindcss' ? 'tailwindcss/index.css' : id
        )
    return { path, base: dirname(path), content: await readFile(path, 'utf8') }
  }
  const { build } = await compile(`@import '@oztix/roadie-core/css';`, {
    base: join(import.meta.dirname, '..'),
    loadStylesheet
  })
  const css = build(variables.map((name) => `w-(${name})`))
  return (name: string) =>
    css.match(new RegExp(`${name}:\\s*([^;]+);`))?.[1] ?? 'not compiled'
}

const remAndPx = (rem: string) => `${rem} (${parseFloat(rem) * 16}px)`

async function sizeRows(width: number, slot: string) {
  const page = await open(width)
  return page
    .locator(`[data-slot=${slot}] [data-slot=size-row]`)
    .evaluateAll((rows) =>
      rows.map((row) => ({
        name: row.querySelector('code')!.textContent!,
        size: row.querySelector('code + span')!.textContent!
      }))
    )
}

describe('Layout foundation', () => {
  for (const width of [375, 1280]) {
    it(`draws each spacing step as wide as its padding utility, at ${width}px`, async () => {
      const page = await open(width)
      const scale = page.locator('[data-slot=spacing-scale]')
      await scale.scrollIntoViewIfNeeded()
      const steps = await scale.evaluate((list) => {
        const probe = document.createElement('div')
        probe.className = 'p-4'
        list.append(probe)
        const unit = parseFloat(getComputedStyle(probe).paddingLeft) / 4
        probe.remove()
        return [...list.querySelectorAll('[data-slot=spacing-step]')].map(
          (step) => ({
            step: Number(step.querySelector('code')!.textContent),
            bar: step
              .querySelector('[data-slot=spacing-bar]')!
              .getBoundingClientRect().width,
            label: step.querySelector('span')!.textContent,
            unit
          })
        )
      })
      expect(steps.map(({ step }) => step)).toEqual(STEPS)
      for (const { step, bar, label, unit } of steps) {
        expect(unit).toBeGreaterThan(0)
        expect(bar, `step ${step}`).toBeCloseTo(step * unit, 1)
        expect(label, `step ${step}`).toBe(`${step * unit}px`)
      }
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth
      )
      expect(overflow).toBe(0)
    }, 60_000)
  }

  it('lists every breakpoint at the width Tailwind compiles', async () => {
    const rows = await sizeRows(1280, 'breakpoint-scale')
    const theme = await compiledTheme(
      BREAKPOINTS.map((name) => `--breakpoint-${name}`)
    )
    expect(rows.map(({ name }) => name)).toEqual(
      BREAKPOINTS.map((name) => `${name}:`)
    )
    for (const { name, size } of rows) {
      expect(size, name).toBe(
        remAndPx(theme(`--breakpoint-${name.slice(0, -1)}`))
      )
    }
  }, 60_000)

  it('lists every container width Tailwind compiles', async () => {
    const rows = await sizeRows(1280, 'container-scale')
    const theme = await compiledTheme(
      CONTAINERS.map((name) => `--container-${name}`)
    )
    expect(rows.map(({ name }) => name)).toEqual(
      CONTAINERS.map((name) => `container-${name}`)
    )
    for (const { name, size } of rows) {
      expect(size, name).toBe(remAndPx(theme(`--${name}`)))
    }
  }, 60_000)

  for (const [width, padding] of [
    [375, '24px'],
    [800, '32px'],
    [1280, '48px']
  ] as const) {
    it(`pads container-8xl by ${padding} at ${width}px, as the table says`, async () => {
      const page = await open(width)
      const actual = await page.evaluate(() => {
        const probe = document.createElement('div')
        probe.className = 'container-8xl'
        document.body.append(probe)
        return getComputedStyle(probe).paddingLeft
      })
      expect(actual).toBe(padding)
      const table = await page
        .locator('#docs-content table')
        .first()
        .locator('tbody td:nth-child(2)')
        .allTextContents()
      expect(table.some((cell) => cell.includes(`(${padding})`))).toBe(true)
    }, 60_000)
  }

  it('describes each scale in its markdown copy without pointing at what it drops', async () => {
    const markdown = await readFile(
      join(import.meta.dirname, '../out/foundations/layout.md'),
      'utf-8'
    )
    for (const heading of [
      'Spacing scale',
      'Breakpoints',
      'Container utility'
    ]) {
      const section = markdown.split(`## ${heading}\n`)[1]!.split('\n## ')[0]!
      expect(section, heading).not.toMatch(/\b(below|above)\b/i)
    }
  })
})
