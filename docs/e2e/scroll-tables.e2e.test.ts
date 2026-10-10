import { createRequire } from 'module'
import { type Browser, type Page, chromium, firefox, webkit } from 'playwright'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import { BASE_PATH, ORIGIN, serveExport } from './serveExport'

const engines = { chromium, firefox, webkit }
const engine = (process.env.E2E_BROWSER ?? 'chromium') as keyof typeof engines
let browser: Browser

beforeAll(async () => {
  browser = await engines[engine].launch()
})

afterAll(async () => {
  await browser?.close()
})

afterEach(async () => {
  await Promise.all(browser.contexts().map((context) => context.close()))
})

const PAGE = '/charts/data-visualisation/'
const PHONE = 375
const DESKTOP = 1280

async function open(width: number, path = PAGE) {
  const context = await browser.newContext({
    viewport: { width, height: 900 }
  })
  await serveExport(context)
  const page = await context.newPage()
  const errors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  page.on('pageerror', (error) => errors.push(String(error)))
  await page.goto(`${ORIGIN}${BASE_PATH}${path}`)
  await page.waitForLoadState('networkidle')
  return { page, errors }
}

/** The scroller of the first table after the heading with this id. */
const scrollerAfter = (page: Page, headingId: string) =>
  page
    .locator(`#${headingId}`)
    .locator(
      "xpath=following::div[contains(concat(' ', @class, ' '), ' prose-scroll ')][1]"
    )

/** Tabs from a button placed just before the scroller, so the page's other stops don't matter. */
async function tabsInto(page: Page, headingId: string) {
  await scrollerAfter(page, headingId).evaluate((scroller) => {
    const before = document.createElement('button')
    before.textContent = 'Before'
    scroller.before(before)
    before.focus()
  })
  await page.keyboard.press('Tab')
  return scrollerAfter(page, headingId).evaluate(
    (scroller) => document.activeElement === scroller
  )
}

describe('Scrolling markdown tables', () => {
  it('reaches a wide table with Tab and names it by its heading', async () => {
    const { page, errors } = await open(PHONE)
    const scroller = scrollerAfter(page, 'writing-for-charts')
    await expect
      .poll(() => scroller.getAttribute('tabindex'), { timeout: 5_000 })
      .toBe('0')

    expect(await tabsInto(page, 'writing-for-charts')).toBe(true)
    expect(await scroller.getAttribute('role')).toBe('region')
    expect(
      await scroller.evaluate((node) => {
        const id = node.getAttribute('aria-labelledby')
        return id && document.getElementById(id)?.textContent
      })
    ).toBe('Writing for charts')
    expect(errors).toEqual([])
  }, 60_000)

  it('scrolls a focused wide table with the arrow keys', async () => {
    const { page } = await open(PHONE)
    const scroller = scrollerAfter(page, 'writing-for-charts')
    await expect
      .poll(() => scroller.getAttribute('tabindex'), { timeout: 5_000 })
      .toBe('0')
    await tabsInto(page, 'writing-for-charts')

    // Playwright's WebKit scrolls on only some synthetic presses, so keep pressing.
    await expect
      .poll(
        async () => {
          await page.keyboard.press('ArrowRight')
          return scroller.evaluate((node) => node.scrollLeft)
        },
        { timeout: 5_000 }
      )
      .toBeGreaterThan(0)
  }, 60_000)

  it('shows the focus ring on a focused table', async () => {
    const { page } = await open(PHONE)
    const scroller = scrollerAfter(page, 'writing-for-charts')
    await expect
      .poll(() => scroller.getAttribute('tabindex'), { timeout: 5_000 })
      .toBe('0')
    await tabsInto(page, 'writing-for-charts')

    const ring = await scroller.evaluate((node) => {
      const style = getComputedStyle(node)
      return {
        style: style.outlineStyle,
        width: parseFloat(style.outlineWidth),
        color: style.outlineColor
      }
    })
    expect(ring.style).toBe('solid')
    expect(ring.width).toBeGreaterThan(0)
    expect(ring.color).not.toMatch(/^rgba\(0, 0, 0, 0\)$|transparent/)
  }, 60_000)

  it('gives a docs component’s prose table the same region as a markdown table', async () => {
    const { page, errors } = await open(PHONE, '/foundations/date-and-time/')
    const scroller = page.locator('.prose-scroll[data-slot=component-reads]')
    await expect
      .poll(() => scroller.getAttribute('tabindex'), { timeout: 5_000 })
      .toBe('0')
    expect(await scroller.getAttribute('role')).toBe('region')
    // The markdown table above it already takes the heading's name.
    expect(await scroller.getAttribute('aria-label')).toBe(
      'Choosing a component, table 2'
    )

    const tables = await page
      .locator('.prose-scroll[data-slot]')
      .evaluateAll((nodes) =>
        nodes.map((node) => ({
          overflows: node.scrollWidth > node.clientWidth,
          focusable: node.getAttribute('tabindex') === '0'
        }))
      )
    expect(tables.length).toBeGreaterThan(1)
    for (const { overflows, focusable } of tables)
      expect(focusable).toBe(overflows)
    expect(errors).toEqual([])
  }, 60_000)

  it('leaves a table that fits out of the tab order', async () => {
    const { page } = await open(PHONE)
    const scroller = scrollerAfter(page, 'writing-for-charts')
    await expect
      .poll(() => scroller.getAttribute('tabindex'), { timeout: 5_000 })
      .toBe('0')

    const fits = scrollerAfter(page, 'pick-the-form-from-the-job')
    expect(
      await fits.evaluate((node) => node.scrollWidth > node.clientWidth)
    ).toBe(false)
    expect(await fits.getAttribute('tabindex')).toBeNull()
    expect(await fits.getAttribute('role')).toBeNull()
    expect(await tabsInto(page, 'pick-the-form-from-the-job')).toBe(false)
  }, 60_000)

  it('adds and removes the tab stop as the table starts and stops overflowing', async () => {
    const { page } = await open(PHONE)
    const scroller = scrollerAfter(page, 'writing-for-charts')
    await expect
      .poll(() => scroller.getAttribute('tabindex'), { timeout: 5_000 })
      .toBe('0')

    await page.setViewportSize({ width: DESKTOP, height: 900 })
    await expect
      .poll(() => scroller.getAttribute('tabindex'), { timeout: 5_000 })
      .toBeNull()
    expect(await scroller.getAttribute('role')).toBeNull()

    await page.setViewportSize({ width: PHONE, height: 900 })
    await expect
      .poll(() => scroller.getAttribute('tabindex'), { timeout: 5_000 })
      .toBe('0')
  }, 60_000)

  it('server-renders tables without a tab stop, so hydration matches', async () => {
    const { page } = await open(PHONE)
    const html = await page.evaluate(async () =>
      (await fetch(location.href)).text()
    )
    expect(html).toContain('class="prose-scroll"')
    expect(html).not.toMatch(/class="prose-scroll[^"]*"[^>]*tabindex/)
  }, 60_000)

  it.each([PAGE, '/foundations/date-and-time/'])(
    'passes axe’s scrollable region and unique landmark rules on %s on a phone',
    async (path) => {
      const { page } = await open(PHONE, path)
      await expect
        .poll(() => page.locator('.prose-scroll[role=region]').count(), {
          timeout: 5_000
        })
        .toBeGreaterThan(1)
      const require = createRequire(import.meta.url)
      await page.addScriptTag({ path: require.resolve('axe-core') })
      const violations = await page.evaluate(async () => {
        const { axe } = window as unknown as {
          axe: {
            run: (
              context: Document,
              options: object
            ) => Promise<{ violations: { id: string; nodes: unknown[] }[] }>
          }
        }
        const result = await axe.run(document, {
          runOnly: ['scrollable-region-focusable', 'landmark-unique']
        })
        return result.violations.map(({ id, nodes }) => [id, nodes.length])
      })
      expect(violations).toEqual([])
    },
    60_000
  )
})
