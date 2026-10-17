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

/** Fills the Explore grid with `count` cards and reports its columns and rows. */
async function exploreRows(width: number, count: number) {
  const context = await browser.newContext({ viewport: { width, height: 900 } })
  await serveExport(context)
  const page = await context.newPage()
  await page.goto(`${ORIGIN}${BASE_PATH}/`)
  await page.waitForLoadState('networkidle')
  return page
    .locator('section:has(> div > h2:text-is("Explore")) > ul')
    .evaluate((ul, count) => {
      const cards = [...ul.children]
      ul.replaceChildren(
        ...Array.from({ length: count }, (_, i) =>
          cards[i % cards.length]!.cloneNode(true)
        )
      )
      const gridWidth = Math.round(ul.getBoundingClientRect().width)
      const rows = new Map<number, number[]>()
      for (const card of ul.children) {
        const { top, width } = card.getBoundingClientRect()
        const row = rows.get(Math.round(top)) ?? []
        rows.set(Math.round(top), [...row, Math.round(width)])
      }
      return {
        columns: getComputedStyle(ul).gridTemplateColumns.split(' ').length,
        rows: [...rows.values()],
        gridWidth
      }
    }, count)
}

describe('home Explore grid', () => {
  it.each([
    [390, 1],
    [480, 2],
    [768, 3],
    [1024, 4],
    [1920, 4]
  ])('shows %ipx as %i across, at most 4', async (width, columns) => {
    expect((await exploreRows(width, 7)).columns).toBe(columns)
  })

  describe.each([480, 768, 1024, 1440])('at %ipx', (width) => {
    it.each([5, 6, 7, 8])(
      'leaves no card alone on a row with %i cards, unless it spans the row',
      async (count) => {
        const { rows, gridWidth } = await exploreRows(width, count)
        for (const row of rows.filter((cards) => cards.length === 1)) {
          expect(row[0]).toBe(gridWidth)
        }
      }
    )
  })
})
