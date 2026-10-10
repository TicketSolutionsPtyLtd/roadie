import { readFile } from 'fs/promises'
import { join } from 'path'
import { type Browser, type Page, chromium, firefox, webkit } from 'playwright'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import { compiledTheme } from './compiledTheme'
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
  await page.goto(`${ORIGIN}${BASE_PATH}/foundations/typography/`)
  await page.waitForLoadState('networkidle')
  return page
}

// Each step's smallest and largest size in px.
const TYPE_SCALE: [string, number, number][] = [
  ['xs', 12, 12],
  ['sm', 14, 14],
  ['base', 16, 16],
  ['lg', 18, 20],
  ['xl', 20, 24],
  ['2xl', 24, 32],
  ['3xl', 28, 40],
  ['4xl', 32, 48],
  ['5xl', 36, 64],
  ['6xl', 40, 76],
  ['7xl', 44, 96]
]

const DISPLAY_WEIGHTS: Record<string, number> = {
  'text-display-ui-1': 700,
  'text-display-ui-2': 700,
  'text-display-ui-3': 700,
  'text-display-ui-4': 700,
  'text-display-ui-5': 600,
  'text-display-ui-6': 600,
  'text-display-prose-1': 900,
  'text-display-prose-2': 700,
  'text-display-prose-3': 700,
  'text-display-prose-4': 700,
  'text-display-prose-5': 700,
  'text-display-prose-6': 700
}

const RHYTHM: Record<string, [number, string]> = {
  display: [1.2, '-0.02em'],
  ui: [1.35, '-0.01em'],
  prose: [1.5, '-0.01em'],
  code: [1.625, '0em']
}

const WEIGHT_NAMES: Record<string, number> = {
  Semibold: 600,
  Bold: 700,
  Black: 900
}

/** Rows of the markdown tables whose first header cell is `header`. */
async function tableRows(page: Page, header: string) {
  return page
    .locator('#docs-content table')
    .evaluateAll(
      (tables, header) =>
        tables
          .filter((table) => table.querySelector('th')?.textContent === header)
          .flatMap((table) =>
            [...table.querySelectorAll('tbody tr')].map((row) =>
              [...row.querySelectorAll('td')].map((cell) => cell.textContent!)
            )
          ),
      header
    )
}

/** Each type scale step's rendered size, by step name. */
async function stepSizes(page: Page) {
  const entries = await page
    .locator('[data-slot=type-step]')
    .evaluateAll((items) =>
      items.map((item) => [
        item.querySelector('code')!.textContent!,
        parseFloat(
          getComputedStyle(item.querySelector('[data-slot=type-sample]')!)
            .fontSize
        )
      ])
    )
  return Object.fromEntries(entries) as Record<string, number>
}

/** What a utility compiles to, measured on a probe element. */
async function computed(page: Page, classes: string) {
  return page.evaluate((classes) => {
    const probe = document.createElement('p')
    probe.className = classes
    probe.textContent = 'Probe'
    document.getElementById('docs-content')!.append(probe)
    const style = getComputedStyle(probe)
    const result = {
      fontSize: parseFloat(style.fontSize),
      fontWeight: Number(style.fontWeight),
      lineHeight: parseFloat(style.lineHeight),
      letterSpacing:
        style.letterSpacing === 'normal' ? 0 : parseFloat(style.letterSpacing),
      fontFamily: style.fontFamily
    }
    probe.remove()
    return result
  }, classes)
}

describe('Typography foundation', () => {
  for (const width of [375, 1280]) {
    it(`sets every type scale step within its labelled range at ${width}px`, async () => {
      const page = await open(width)
      const scale = page.locator('[data-slot=type-scale]')
      await scale.scrollIntoViewIfNeeded()
      const steps = await scale
        .locator('[data-slot=type-step]')
        .evaluateAll((items) =>
          items.map((item) => ({
            step: item.querySelector('code')!.textContent,
            size: parseFloat(
              getComputedStyle(item.querySelector('[data-slot=type-sample]')!)
                .fontSize
            ),
            label: item.querySelector('[data-slot=type-size]')!.textContent,
            right: item.getBoundingClientRect().right
          }))
        )
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth
      )

      expect(steps.map(({ step }) => step)).toEqual(
        TYPE_SCALE.map(([step]) => step)
      )
      TYPE_SCALE.forEach(([, min, max], index) => {
        const step = steps[index]!
        expect(step.label).toBe(min === max ? `${min}px` : `${min} to ${max}px`)
        expect(step.size).toBeGreaterThanOrEqual(min - 0.5)
        expect(step.size).toBeLessThanOrEqual(max + 0.5)
        expect(step.right).toBeLessThanOrEqual(width)
      })
      expect(overflow).toBe(0)
    }, 60_000)
  }

  it('compiles every type scale step to the range its label states', async () => {
    const theme = await compiledTheme(
      TYPE_SCALE.map(([step]) => `--text-${step}`)
    )
    const rem = (px: number) => `${px / 16}rem`.replace('.', '\\.')

    for (const [step, min, max] of TYPE_SCALE) {
      expect(theme(`--text-${step}`), step).toMatch(
        min === max
          ? new RegExp(`^${rem(min)}$`)
          : new RegExp(`^clamp\\(${rem(min)},.*,\\s*${rem(max)}\\)$`)
      )
    }
  })

  it('renders each display style at the weight and size its table states', async () => {
    const page = await open(1280)
    const samples = await page
      .locator('[data-slot=display-style]')
      .evaluateAll((items) =>
        items.map((item) => {
          const style = getComputedStyle(
            item.querySelector('[data-slot=display-sample]')!
          )
          return {
            utility: item.querySelector('code')!.textContent!,
            fontSize: parseFloat(style.fontSize),
            fontWeight: Number(style.fontWeight)
          }
        })
      )
    const rows = await tableRows(page, 'Utility').then((rows) =>
      rows.filter(([utility]) => utility!.startsWith('text-display'))
    )
    const sizes = await stepSizes(page)

    expect(samples.map(({ utility }) => utility)).toEqual(
      Object.keys(DISPLAY_WEIGHTS)
    )
    expect(rows.map(([utility]) => utility)).toEqual(
      Object.keys(DISPLAY_WEIGHTS)
    )
    for (const [utility, size, weight] of rows) {
      const sample = samples.find((sample) => sample.utility === utility)!
      expect(sample.fontWeight).toBe(DISPLAY_WEIGHTS[utility!])
      expect(weight).toBe(
        `${Object.keys(WEIGHT_NAMES).find((name) => WEIGHT_NAMES[name] === sample.fontWeight)} (${sample.fontWeight})`
      )
      expect(sample.fontSize).toBeCloseTo(sizes[size!]!, 1)
    }
  }, 60_000)

  it('lists each context with its line height and letter spacing', async () => {
    const page = await open(1280)
    const rows = await page
      .locator('[data-slot=rhythm-table] tbody tr')
      .evaluateAll((items) =>
        items.map((item) =>
          [...item.querySelectorAll('td')].map((cell) => cell.textContent!)
        )
      )

    expect(rows).toEqual(
      Object.entries(RHYTHM).map(([context, [leading, tracking]]) => [
        context,
        String(leading),
        tracking
      ])
    )
  }, 60_000)

  it('sets each body style at its size and context rhythm', async () => {
    const page = await open(1280)
    const rows = await tableRows(page, 'Utility').then((rows) =>
      rows.filter(([utility]) => !utility!.startsWith('text-display'))
    )
    const sizes = await stepSizes(page)

    expect(rows.map(([utility]) => utility)).toEqual([
      'text-ui',
      'text-prose',
      'text-ui-meta',
      'text-code'
    ])
    for (const [utility, , size, context] of rows) {
      const style = await computed(page, utility!)
      const [leading, tracking] = RHYTHM[context!]!
      expect(style.fontSize).toBeCloseTo(sizes[size!]!, 1)
      expect(style.lineHeight).toBeCloseTo(style.fontSize * leading, 0)
      expect(style.letterSpacing).toBeCloseTo(
        style.fontSize * parseFloat(tracking),
        1
      )
    }
    expect((await computed(page, 'text-code')).fontFamily).toMatch(
      /IBM Plex Mono/
    )
  }, 60_000)

  it('describes the scales in its markdown copy without pointing at what it drops', async () => {
    const markdown = await readFile(
      join(import.meta.dirname, '../out/foundations/typography.md'),
      'utf-8'
    )
    for (const heading of [
      '## Type scale',
      '### Display styles',
      '## Line height and tracking'
    ]) {
      const section = markdown.split(heading)[1]!.split('\n#')[0]!
      expect(section).not.toMatch(/\b(below|above)\b/i)
    }
  })
})
