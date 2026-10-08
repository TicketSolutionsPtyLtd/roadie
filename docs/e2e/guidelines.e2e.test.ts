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

async function open(path: string, width: number) {
  const context = await browser.newContext({
    viewport: { width, height: 900 }
  })
  await serveExport(context)
  const page = await context.newPage()
  await page.goto(`${ORIGIN}${BASE_PATH}${path}`)
  await page.waitForLoadState('networkidle')
  return page
}

/** The example slot of the first card under a guideline, and the example inside it. */
async function exampleUnder(
  page: Awaited<ReturnType<typeof open>>,
  title: string
) {
  const slot = page
    .locator('[data-slot=guideline]')
    .filter({ hasText: title })
    .locator('[data-slot=guideline-example]')
    .first()
  await slot.scrollIntoViewIfNeeded()
  return slot.evaluate((node) => {
    const style = getComputedStyle(node)
    const content =
      node.clientWidth -
      parseFloat(style.paddingLeft) -
      parseFloat(style.paddingRight)
    return {
      content,
      example: node.firstElementChild!.getBoundingClientRect().width
    }
  })
}

describe('Guidelines in docs MDX', () => {
  it('spaces each guideline 32px below the one before', async () => {
    const page = await open('/components/avatar/', 1280)
    const gaps = await page.evaluate(() => {
      const items = [
        ...document.querySelectorAll(
          '[data-slot=guidelines] > [data-slot=guideline]'
        )
      ]
      return items
        .slice(1)
        .map(
          (item, index) =>
            item.getBoundingClientRect().top -
            items[index]!.getBoundingClientRect().bottom
        )
    })
    expect(gaps.length).toBeGreaterThan(0)
    for (const gap of gaps) expect(gap).toBeCloseTo(32, 0)
  }, 60_000)

  it('gives a width example its spacing-scale width when the card has room', async () => {
    const page = await open('/charts/dashboard-period/', 375)
    const { content, example } = await exampleUnder(
      page,
      'Pair it with large controls'
    )
    expect(content).toBeGreaterThan(288)
    // w-72
    expect(example).toBeCloseTo(288, 0)
  }, 60_000)

  it('keeps a width example inside a card narrower than the width', async () => {
    // Two cards share the row on desktop, each narrower than w-72.
    const page = await open('/charts/dashboard-period/', 1280)
    const { content, example } = await exampleUnder(
      page,
      'Pair it with large controls'
    )
    expect(content).toBeLessThan(288)
    expect(example).toBeCloseTo(content, 0)
  }, 60_000)

  it('sets a row example’s caption at the guidance size, untouched by the docs prose', async () => {
    const page = await open('/components/icon-tile/', 1280)
    const slot = page
      .locator('[data-slot=guideline]')
      .filter({ hasText: 'Pair a meaningful tile with a label' })
      .locator('[data-slot=guideline-example]')
      .first()
    await slot.scrollIntoViewIfNeeded()
    const caption = slot.getByText('Payment complete')
    const { size, margin, tile, text } = await caption.evaluate((node) => {
      const tile = node.previousElementSibling!.getBoundingClientRect()
      const text = node.getBoundingClientRect()
      return {
        size: getComputedStyle(node).fontSize,
        margin: getComputedStyle(node).marginTop,
        tile: { right: tile.right, middle: tile.top + tile.height / 2 },
        text: { left: text.left, middle: text.top + text.height / 2 }
      }
    })
    expect(size).toBe('14px')
    expect(margin).toBe('0px')
    expect(text.left - tile.right).toBeCloseTo(8, 0)
    expect(text.middle).toBeCloseTo(tile.middle, 0)
  }, 60_000)
})
