import {
  type Browser,
  type Locator,
  chromium,
  firefox,
  webkit
} from 'playwright'
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
  await page.goto(`${ORIGIN}${BASE_PATH}/foundations/navigation/`)
  await page.waitForLoadState('networkidle')
  return page
}

const PARTS = ['Navigator', 'Navigator.Primary', 'Navigator.Secondary', 'Pane']

// The Navigator and Pane pages link to these sections.
const LINKED_SECTIONS = [
  'the-shell',
  'server-and-client',
  'keep-the-list-and-more-in-the-url',
  'an-empty-detail-column'
]

/** Each pane's title, in the order the panes render. */
const paneTitles = (example: Locator) =>
  example
    .locator('[data-slot=pane]')
    .evaluateAll((panes) =>
      panes.map(
        (pane) =>
          pane.querySelector('[data-slot=pane-title]')?.textContent?.trim() ??
          ''
      )
    )

describe('Navigation foundation', () => {
  for (const width of [375, 1280]) {
    it(`draws the four parts of the model without overflowing, at ${width}px`, async () => {
      const page = await open(width)
      const diagram = page.locator('[data-slot=navigation-model]')
      await diagram.scrollIntoViewIfNeeded()
      const names = await diagram
        .locator('[data-slot=model-part] > p > span:first-child')
        .allTextContents()
      expect([...new Set(names)]).toEqual(PARTS)
      expect(names.filter((name) => name === 'Pane')).toHaveLength(3)

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth
      )
      expect(overflow).toBe(0)
    }, 60_000)
  }

  it('renders the panes the URL table lists for each level', async () => {
    const page = await open(1280)
    const table = page.locator('table', {
      has: page.locator('th', { hasText: 'Panes' })
    })
    await table.scrollIntoViewIfNeeded()
    const rows = await table.locator('tbody tr').evaluateAll((trs) =>
      trs.map((tr) => {
        const [panes, url] = [...tr.querySelectorAll('td')].map((td) =>
          td.textContent!.trim()
        )
        return { url: url!, panes: panes!.split(', ') }
      })
    )
    expect(rows.map(({ panes }) => panes.length)).toEqual([1, 2, 3])

    const example = page.locator(
      'xpath=//*[@id="a-three-pane-drill-down"]/following::*[@data-live-example][1]'
    )
    await example.scrollIntoViewIfNeeded()

    for (const [level, { url, panes }] of rows.entries()) {
      if (level > 0) {
        const [, , , event, ticket] = url.split('/')
        const id = level === 1 ? event : ticket
        await example.locator(`a[href$='/${id}']`).last().click()
      }
      await expect
        .poll(() => paneTitles(example), { message: url })
        .toEqual(panes)
    }
  }, 60_000)

  it('keeps the sections other pages link to', async () => {
    const page = await open(1280)
    for (const id of LINKED_SECTIONS)
      await expect
        .poll(() => page.locator(`[id='${id}']`).count(), { message: id })
        .toBe(1)
  }, 60_000)
})
