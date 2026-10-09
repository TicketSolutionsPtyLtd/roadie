import { readFile } from 'fs/promises'
import { join } from 'path'
import { type Browser, chromium, firefox, webkit } from 'playwright'
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
const BREAKPOINTS = ['sm:', 'md:', 'lg:', 'xl:', '2xl:']
// The docs build compiles only the variants it uses.
const COMPILED_BREAKPOINTS = ['sm:', 'md:', 'lg:']
const CONTAINERS = [
  'container-3xs',
  'container-2xs',
  'container-xs',
  'container-sm',
  'container-md',
  'container-lg',
  'container-xl',
  'container-2xl',
  'container-3xl',
  'container-4xl',
  'container-5xl',
  'container-6xl',
  'container-7xl',
  'container-8xl'
]
// Pane measure and the page's own examples use these, so the build emits them.
const EMITTED_CONTAINERS = ['container-sm', 'container-4xl', 'container-8xl']

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

  it('lists every breakpoint at the width its compiled variant switches at', async () => {
    const page = await open(1280)
    const { rows, compiled } = await page.evaluate(() => {
      const rows = [
        ...document.querySelectorAll(
          '[data-slot=breakpoint-scale] [data-slot=size-row]'
        )
      ].map((row) => ({
        name: row.querySelector('code')!.textContent!,
        px: row.querySelector('[data-slot=size-px]')!.textContent!
      }))
      // Each variant's rules sit in a media query, nested either way round.
      const compiled: Record<string, string> = {}
      const rootPx = parseFloat(
        getComputedStyle(document.documentElement).fontSize
      )
      const visit = (rules: CSSRuleList, selector = '', media = '') => {
        for (const rule of rules) {
          const ownSelector =
            rule instanceof CSSStyleRule ? rule.selectorText : selector
          const ownMedia =
            rule instanceof CSSMediaRule ? rule.conditionText : media
          const prefix = ownSelector.match(/^\.(sm|md|lg|xl|2xl)\\:/)?.[1]
          const min = ownMedia.match(
            /(?:min-width:\s*|width\s*>=\s*)([\d.]+)rem/
          )
          if (prefix && min)
            compiled[`${prefix}:`] = `(${parseFloat(min[1]!) * rootPx}px)`
          if ('cssRules' in rule)
            visit((rule as CSSGroupingRule).cssRules, ownSelector, ownMedia)
        }
      }
      for (const sheet of document.styleSheets) visit(sheet.cssRules)
      return { rows, compiled }
    })
    expect(rows.map(({ name }) => name)).toEqual(BREAKPOINTS)
    for (const name of COMPILED_BREAKPOINTS) {
      expect(compiled[name], name).toBeDefined()
      expect(rows.find((row) => row.name === name)!.px, name).toBe(
        compiled[name]
      )
    }
  }, 60_000)

  it('lists every container width as its token resolves', async () => {
    const page = await open(1280)
    const rows = await page
      .locator('[data-slot=container-scale] [data-slot=size-row]')
      .evaluateAll((items) =>
        items.map((item) => {
          const name = item.querySelector('code')!.textContent!
          const probe = document.createElement('div')
          probe.style.width = `var(--${name})`
          item.append(probe)
          const resolved = getComputedStyle(probe).width
          probe.remove()
          return {
            name,
            px: item.querySelector('[data-slot=size-px]')!.textContent!,
            resolved: `(${resolved})`
          }
        })
      )
    expect(rows.map(({ name }) => name)).toEqual(CONTAINERS)
    for (const name of EMITTED_CONTAINERS) {
      const row = rows.find((candidate) => candidate.name === name)!
      expect(row.px, name).toBe(row.resolved)
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
