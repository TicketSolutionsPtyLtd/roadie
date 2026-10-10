import { readFile } from 'fs/promises'
import { join } from 'path'
import { type Browser, chromium, firefox, webkit } from 'playwright'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import { compiledCss, compiledTheme } from './compiledTheme'
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

async function open(width: number, reducedMotion?: 'reduce') {
  const context = await browser.newContext({
    viewport: { width, height: 900 },
    reducedMotion
  })
  await serveExport(context)
  const page = await context.newPage()
  await page.goto(`${ORIGIN}${BASE_PATH}/foundations/motion/`)
  await page.waitForLoadState('networkidle')
  return page
}

const DURATIONS = [
  'instant',
  'fastest',
  'fast',
  'normal',
  'moderate',
  'slow',
  'slower',
  'slowest',
  'ambient',
  'sweep'
]
const EASINGS = ['standard', 'enter', 'exit', 'spring', 'spring-lively']

const oneLine = (value: string) =>
  value.replace(/\s+/g, ' ').replace(/\(\s/g, '(').replace(/\s\)/g, ')')

const twin = () =>
  readFile(join(import.meta.dirname, '../out/foundations/motion.md'), 'utf-8')

describe('Motion foundation', () => {
  it('lists every duration at the value Tailwind compiles, with a class only where one compiles', async () => {
    const page = await open(1280)
    const rows = await page
      .locator('[data-slot=duration-scale] [data-slot=duration-row]')
      .evaluateAll((items) =>
        items.map((item) => ({
          name: item.querySelector('code')!.textContent!,
          value: item.querySelector('[data-slot=duration-value]')!.textContent!,
          className: item.querySelector('code[data-slot=duration-class]')
            ?.textContent,
          bar: item
            .querySelector('[data-slot=duration-bar]')!
            .getBoundingClientRect().width
        }))
      )
    const names = [
      ...DURATIONS.map((step) => `--duration-${step}`),
      '--stagger-base'
    ]
    expect(rows.map(({ name }) => name)).toEqual(names)

    const theme = await compiledTheme(names)
    const css = await compiledCss(DURATIONS.map((step) => `duration-${step}`))
    const longest = rows.find(({ name }) => name === '--duration-sweep')!.bar
    for (const { name, value, className, bar } of rows) {
      expect(value, name).toBe(theme(name))
      const step = name.replace('--duration-', '')
      const compiles = new RegExp(
        `\\.duration-${step} \\{[^}]*transition-duration: var\\(${name}\\)`
      ).test(css)
      expect(className, name).toBe(compiles ? `duration-${step}` : undefined)
      expect(bar / longest, name).toBeCloseTo(parseFloat(value) / 2400, 2)
    }
  }, 60_000)

  it('lists every easing at the value Tailwind compiles', async () => {
    const page = await open(1280)
    const rows = await page
      .locator('[data-slot=easing-scale] [data-slot=easing-row]')
      .evaluateAll((items) =>
        items.map((item) => ({
          name: item.querySelector('code')!.textContent!,
          value: item.querySelector('[data-slot=easing-value]')!.textContent!,
          className: item.querySelector('[data-slot=easing-class]')!.textContent
        }))
      )
    const names = EASINGS.map((name) => `--ease-${name}`)
    expect(rows.map(({ name }) => name)).toEqual(names)
    const theme = await compiledTheme(names)
    for (const { name, value, className } of rows) {
      expect(value, name).toBe(oneLine(theme(name)))
      expect(className, name).toBe(name.slice(2))
    }
  }, 60_000)

  it('fits a phone without scrolling sideways', async () => {
    const page = await open(375)
    await page.locator('[data-slot=easing-scale]').scrollIntoViewIfNeeded()
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth
    )
    expect(overflow).toBe(0)
  }, 60_000)

  // What the Accessibility section says the reset does and doesn't change.
  it('cuts durations under reduced motion but keeps delays', async () => {
    const page = await open(1280, 'reduce')
    const timing = await page.evaluate(() => {
      const probe = document.createElement('div')
      probe.style.transition = 'opacity 300ms ease 90ms'
      probe.style.animation = 'fade-in 300ms ease 90ms infinite'
      document.body.append(probe)
      const style = getComputedStyle(probe)
      return {
        transitionDuration: parseFloat(style.transitionDuration),
        transitionDelay: style.transitionDelay,
        animationDuration: parseFloat(style.animationDuration),
        animationDelay: style.animationDelay,
        iterations: style.animationIterationCount
      }
    })
    expect(timing.transitionDuration).toBeLessThan(0.001)
    expect(timing.animationDuration).toBeLessThan(0.001)
    expect(timing.iterations).toBe('1')
    expect(timing.transitionDelay).toBe('0.09s')
    expect(timing.animationDelay).toBe('0.09s')
  }, 60_000)

  it('names every motion utility in its markdown copy', async () => {
    const { tokens } = JSON.parse(
      await readFile(
        join(import.meta.dirname, '../../packages/core/src/tokens/tokens.json'),
        'utf-8'
      )
    ) as { tokens: { name: string; family: string; kind: string }[] }
    const utilities = tokens
      .filter(
        ({ family, kind }) =>
          family === 'motion' && (kind === 'utility' || kind === 'class')
      )
      .map(({ name }) => name)
    expect(utilities.length).toBeGreaterThan(10)
    const markdown = await twin()
    expect(
      utilities.filter((name) => !markdown.includes(`\`${name}\``))
    ).toEqual([])
  })

  it('describes each scale in its markdown copy without pointing above or below', async () => {
    const markdown = await twin()
    for (const heading of ['Duration scale', 'Easing curves']) {
      const section = markdown.split(`## ${heading}\n`)[1]!.split('\n## ')[0]!
      expect(section, heading).not.toMatch(/\b(below|above)\b/i)
    }
  })
})
