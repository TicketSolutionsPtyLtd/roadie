import { type Browser, chromium, firefox, webkit } from 'playwright'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import { settled } from './routerReady'
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
  await page.goto(`${ORIGIN}${BASE_PATH}/components/breadcrumb/`)
  await settled(page)
  if (dark)
    await page.evaluate(() => document.documentElement.classList.add('dark'))
  return page
}

const TRANSPARENT = 'rgba(0, 0, 0, 0)'

describe('Secondary navigation', () => {
  for (const dark of [false, true]) {
    const mode = dark ? 'dark' : 'light'

    // Next lowers CSS nesting, which once let a row's resting fill outrank its hover.
    it(`tints a row on hover and keyboard focus, in ${mode} mode`, async () => {
      const page = await open(1440, dark)
      const nav = page.locator('[data-slot=navigator-secondary-items]')
      const row = nav.getByRole('link', { name: 'Steps' })
      const background = () =>
        row.evaluate((element) => getComputedStyle(element).backgroundColor)

      expect(await background()).toBe(TRANSPARENT)

      await row.hover()
      await expect.poll(background).not.toBe(TRANSPARENT)

      await page.mouse.move(0, 0)
      await expect.poll(background).toBe(TRANSPARENT)

      await row.focus()
      await expect
        .poll(() =>
          row.evaluate((element) => {
            const style = getComputedStyle(element)
            return {
              focusVisible: element.matches(':focus-visible'),
              ring: style.outlineWidth,
              tinted: style.backgroundColor !== 'rgba(0, 0, 0, 0)'
            }
          })
        )
        .toEqual({
          focusVisible: true,
          ring: await row.evaluate((element) =>
            getComputedStyle(element).getPropertyValue('--focus-ring-width')
          ),
          tinted: true
        })
    }, 60_000)
  }

  for (const width of [1280, 1440, 1728]) {
    it(`stays slim beside the page, with every title whole, at ${width}px`, async () => {
      const page = await open(width)
      const list = page.locator('[data-navigator-secondary="/components"]')
      const box = await list.boundingBox()
      expect(box?.width).toBeLessThanOrEqual(18 * 16)

      const rows = await list
        .locator('[data-slot=list-item]')
        .evaluateAll((items) =>
          items.map((item) => {
            const title = item.querySelector('[data-slot=list-item-title]')!
            return {
              height: item.getBoundingClientRect().height,
              whole: title.scrollWidth <= title.clientWidth
            }
          })
        )
      expect(rows.length).toBeGreaterThan(20)
      expect(rows.filter((row) => !row.whole)).toEqual([])
      expect(new Set(rows.map((row) => row.height))).toEqual(new Set([40]))
    }, 60_000)
  }
})
