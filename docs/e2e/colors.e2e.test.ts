import Color from 'colorjs.io'
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

async function open(width: number, dark = false) {
  const context = await browser.newContext({
    viewport: { width, height: 900 },
    colorScheme: dark ? 'dark' : 'light'
  })
  await serveExport(context)
  const page = await context.newPage()
  await page.goto(`${ORIGIN}${BASE_PATH}/foundations/colors/`)
  await page.waitForLoadState('networkidle')
  if (dark)
    await page.evaluate(() => document.documentElement.classList.add('dark'))
  return page
}

// AGENTS.md names these, so a scale or intent that goes missing fails here.
const SCALES = [
  'neutral',
  'brand',
  'brand-secondary',
  'accent',
  'danger',
  'success',
  'warning',
  'info'
]
const STEPS = Array.from({ length: 14 }, (_, step) => String(step))
const INTENTS = [
  'intent-neutral',
  'intent-brand',
  'intent-brand-secondary',
  'intent-brand-purple',
  'intent-brand-blue',
  'intent-brand-orange',
  'intent-accent',
  'intent-danger',
  'intent-success',
  'intent-warning',
  'intent-info'
]
const PRESETS = [
  'emphasis-strong',
  'emphasis-normal',
  'emphasis-subtle',
  'emphasis-subtler'
]
const DATAVIZ_SETS = { categorical: 8, heat: 9, diverging: 9, status: 4 }

const lightness = (css: string) => new Color(css).to('oklch').coords[0]!
const alpha = (css: string) => Number(new Color(css).alpha)

describe('Colors foundation', () => {
  for (const dark of [false, true]) {
    const mode = dark ? 'dark' : 'light'

    it(`renders every colour scale's 14 steps, ${dark ? 'darkest' : 'lightest'} first, in ${mode} mode`, async () => {
      const page = await open(1280, dark)
      const scales = await page
        .locator('[data-slot=scale-swatches] > li')
        .evaluateAll((items) =>
          items.map((item) => ({
            scale: item.getAttribute('data-scale'),
            steps: [...item.querySelectorAll('ol > li')].map((step) => ({
              label: step.querySelector('span')!.textContent,
              fill: getComputedStyle(
                step.querySelector('[data-slot=scale-swatch]')!
              ).backgroundColor
            }))
          }))
        )
      expect(scales.map(({ scale }) => scale)).toEqual(SCALES)
      for (const { scale, steps } of scales) {
        expect(
          steps.map(({ label }) => label),
          scale!
        ).toEqual(STEPS)
        for (const { fill } of steps) expect(alpha(fill), scale!).toBe(1)
        const first = lightness(steps[0]!.fill)
        const last = lightness(steps.at(-1)!.fill)
        if (dark) expect(first, scale!).toBeLessThan(last)
        else expect(first, scale!).toBeGreaterThan(last)
      }
    }, 60_000)
  }

  it('shows every intent with the four colour presets, and each brand alias matches its intent', async () => {
    const page = await open(1280)
    const rows = await page
      .locator('[data-slot=intent-emphasis] > li')
      .evaluateAll((items) =>
        items.map((item) => ({
          intent: item.getAttribute('data-intent')!,
          samples: [
            ...item.querySelectorAll<HTMLElement>('[data-slot=intent-sample]')
          ].map((sample) => ({
            preset: sample.dataset.emphasis!,
            fill: getComputedStyle(sample).backgroundColor,
            text: getComputedStyle(sample).color
          }))
        }))
      )
    expect(rows.map(({ intent }) => intent)).toEqual(INTENTS)
    const byIntent = Object.fromEntries(
      rows.map(({ intent, samples }) => [intent, samples])
    )
    for (const { intent, samples } of rows) {
      expect(
        samples.map(({ preset }) => preset),
        intent
      ).toEqual(PRESETS)
      expect(alpha(samples[0]!.fill), intent).toBe(1)
      expect(alpha(samples[2]!.fill), intent).toBeGreaterThan(0)
      if (intent !== 'intent-neutral')
        expect(samples[0]!.fill, intent).not.toBe(
          byIntent['intent-neutral']![0]!.fill
        )
    }
    // The page says each alias is the same as the intent it names.
    expect(byIntent['intent-brand-blue']).toEqual(byIntent['intent-brand'])
    expect(byIntent['intent-brand-orange']).toEqual(
      byIntent['intent-brand-secondary']
    )
    expect(byIntent['intent-brand-purple']).toEqual(byIntent['intent-info'])
  }, 60_000)

  for (const dark of [false, true]) {
    const mode = dark ? 'dark' : 'light'

    it(`labels each strong fill as the text on strong fills table says, in ${mode} mode`, async () => {
      const page = await open(1280, dark)
      const rows = await page
        .locator('table', {
          has: page.getByRole('columnheader', { name: 'APCA Lc, light' })
        })
        .locator('tbody tr')
        .evaluateAll((trs) =>
          trs.map((tr) =>
            [...tr.querySelectorAll('td')].map((td) => td.textContent!.trim())
          )
        )
      expect(rows.map(([intent]) => `intent-${intent}`)).toEqual(
        expect.arrayContaining(INTENTS)
      )
      for (const [intent, light, darkLabel, lc] of rows) {
        const sample = page.locator(
          `[data-intent=intent-${intent}] [data-emphasis=emphasis-strong]`
        )
        const { fill, text } = await sample.evaluate((element) => ({
          fill: getComputedStyle(element).backgroundColor,
          text: getComputedStyle(element).color
        }))
        const label = dark ? darkLabel : light
        if (label === 'White') expect(lightness(text), intent).toBeCloseTo(1, 2)
        else expect(lightness(text), intent).toBeLessThan(0.3)

        const measured = Math.abs(
          new Color(fill).contrast(new Color(text), 'APCA')
        )
        expect(measured, intent).toBeGreaterThanOrEqual(60)
        if (!dark) expect(Math.round(measured), intent).toBe(Number(lc))
      }
    }, 60_000)

    it(`draws each data visualisation set as its tokens do, in ${mode} mode`, async () => {
      const page = await open(1280, dark)
      for (const [kind, count] of Object.entries(DATAVIZ_SETS)) {
        const swatches = await page
          .locator(
            `[data-slot=dataviz-swatches][data-kind=${kind}] [data-mode=${mode}] [data-slot=dataviz-swatch]`
          )
          .evaluateAll((items) =>
            items.map((item) => {
              const probe = document.createElement('div')
              probe.style.backgroundColor = `var(${item.getAttribute('title')})`
              item.append(probe)
              const token = getComputedStyle(probe).backgroundColor
              probe.remove()
              return {
                name: item.getAttribute('title')!,
                shown: getComputedStyle(item).backgroundColor,
                token
              }
            })
          )
        expect(swatches, kind).toHaveLength(count)
        for (const { name, shown, token } of swatches) {
          expect(alpha(token), name).toBe(1)
          expect(new Color(shown).deltaE(token, '2000'), name).toBeLessThan(1)
        }
      }
    }, 60_000)
  }

  it('fits a phone without scrolling sideways', async () => {
    const page = await open(375)
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth
    )
    expect(overflow).toBe(0)
  }, 60_000)

  it('describes each token view in its markdown copy without pointing at the swatches it drops', async () => {
    const markdown = await readFile(
      join(import.meta.dirname, '../out/foundations/colors.md'),
      'utf-8'
    )
    for (const heading of [
      'Colour scales',
      'Intent and emphasis',
      'Data visualisation colours'
    ]) {
      const section = markdown.split(`## ${heading}\n`)[1]!.split('\n## ')[0]!
      expect(section, heading).not.toMatch(/\b(below|above)\b/i)
    }
    expect(markdown).toMatch(
      /\|\s*brand-orange\s*\|\s*Step 13\s*\|\s*Step 0\s*\|\s*61\s*\|/
    )
  })
})
