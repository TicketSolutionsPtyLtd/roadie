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
  await page.goto(`${ORIGIN}${BASE_PATH}/foundations/theming/`)
  await page.waitForLoadState('networkidle')
  if (dark)
    await page.evaluate(() => document.documentElement.classList.add('dark'))
  return page
}

// The page says the accent drives these two scales and no others.
const FOLLOWING = ['neutral', 'accent']
const STEPS = Array.from({ length: 14 }, (_, step) => String(step))
// Mid steps, where both scales carry enough chroma for a stable hue.
const HUED_STEPS = ['5', '6', '7', '8', '9']
const THEME_PROPS = [
  'accentColor',
  'defaultAccentColor',
  'defaultDark',
  'followSystem'
]

const oklch = (css: string) => new Color(css).to('oklch').coords
const hueGap = (a: number, b: number) => {
  const gap = Math.abs(a - b) % 360
  return Math.min(gap, 360 - gap)
}

async function swatches(page: Awaited<ReturnType<typeof open>>) {
  return page
    .locator('[data-slot=accent-scales] [data-scale]')
    .evaluateAll((items) =>
      items.map((item) => ({
        scale: item.getAttribute('data-scale')!,
        steps: [...item.querySelectorAll('ol > li')].map((step) => ({
          label: step.querySelector('span')!.textContent!,
          fill: getComputedStyle(
            step.querySelector('[data-slot=scale-swatch]')!
          ).backgroundColor
        }))
      }))
    )
}

describe('Theming foundation', () => {
  it('lists the default accent and the accent properties as the stylesheet sets them', async () => {
    const page = await open(1280)
    const shown = Object.fromEntries(
      await page
        .locator('[data-slot=accent-parameter]')
        .evaluateAll((items) =>
          items.map((item) => [
            item.getAttribute('data-name'),
            item.textContent
          ])
        )
    )
    const root = await page.evaluate(() => {
      const style = getComputedStyle(document.documentElement)
      return {
        hue: style.getPropertyValue('--accent-hue').trim(),
        chroma: style.getPropertyValue('--accent-chroma').trim()
      }
    })
    expect(Object.keys(shown)).toEqual(['--accent-hue', '--accent-chroma'])
    expect(Number(shown['--accent-hue'])).toBe(Number(root.hue))
    expect(Number(shown['--accent-chroma'])).toBe(Number(root.chroma))

    const hex = await page.locator('[data-slot=default-accent]').textContent()
    expect(hex).toMatch(/^#[0-9a-f]{6}$/i)
    expect(hueGap(oklch(hex!)[2]!, Number(root.hue))).toBeLessThan(1)
  }, 60_000)

  for (const dark of [false, true]) {
    const mode = dark ? 'dark' : 'light'

    it(`draws the scales the accent drives, and they follow a new accent hue, in ${mode} mode`, async () => {
      const page = await open(1280, dark)
      const before = await swatches(page)
      expect(before.map(({ scale }) => scale)).toEqual(FOLLOWING)
      for (const { scale, steps } of before)
        expect(
          steps.map(({ label }) => label),
          scale
        ).toEqual(STEPS)

      await page.evaluate(() =>
        document.documentElement.style.setProperty('--accent-hue', '30')
      )
      for (const { scale, steps } of await swatches(page)) {
        for (const { label, fill } of steps) {
          if (!HUED_STEPS.includes(label)) continue
          expect(hueGap(oklch(fill)[2]!, 30), `${scale} ${label}`).toBeLessThan(
            3
          )
        }
      }
    }, 60_000)
  }

  it("lists ThemeProvider's props", async () => {
    const page = await open(1280)
    const reference = page.locator('#docs-content', {
      has: page.getByRole('heading', { name: 'API reference' })
    })
    for (const prop of THEME_PROPS)
      expect(
        await reference.getByText(prop, { exact: true }).count(),
        prop
      ).toBeGreaterThan(0)
  }, 60_000)

  it('fits a phone without scrolling sideways', async () => {
    const page = await open(375)
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth
    )
    expect(overflow).toBe(0)
  }, 60_000)

  it('keeps the props in its markdown copy and describes the scales it drops', async () => {
    const markdown = await readFile(
      join(import.meta.dirname, '../out/foundations/theming.md'),
      'utf-8'
    )
    const section = markdown.split('## Accent scales\n')[1]!.split('\n## ')[0]!
    expect(section).toMatch(/On the docs site/)
    expect(section).not.toMatch(/\b(below|above)\b/i)
    for (const prop of THEME_PROPS) expect(markdown).toContain(`- \`${prop}\``)
  })
})
