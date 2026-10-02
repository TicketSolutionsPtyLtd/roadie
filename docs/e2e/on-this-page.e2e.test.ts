import { type Browser, type Page, chromium, firefox, webkit } from 'playwright'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

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

/** Scrolls the pane to a section's heading, or to the first example under it. */
const scrollTo = (page: Page, heading: string, into: 'heading' | 'example') =>
  page.evaluate(
    ([heading, into]) => {
      const target = [
        ...document.querySelectorAll('#docs-content :is(h2, h3)')
      ].find(
        (node) =>
          node.textContent === heading && !node.closest('[data-live-example]')
      )!
      let example = target.nextElementSibling
      while (example && !example.querySelector('[data-live-example]'))
        example = example.nextElementSibling
      ;(into === 'example' ? example! : target).scrollIntoView()
    },
    [heading, into] as const
  )

const nav = (page: Page) =>
  page.getByRole('navigation', { name: 'On this page' })

/** The highlighted heading once it settles, or the last one seen. */
async function activeHeading(page: Page, expected: string) {
  const active = (expected: string | null) => {
    const text =
      document.querySelector(
        'nav[aria-label="On this page"] [aria-current="location"]'
      )?.textContent ?? null
    return expected === null ? text : text === expected
  }
  await page
    .waitForFunction(active, expected, { timeout: 2000 })
    .catch(() => {})
  return page.evaluate(active, null)
}

const sections = ['Default', 'Keys', 'Emphasis', 'Sizes', 'Composition']
const jumps = [
  ...sections,
  ...[...sections].reverse(),
  'Keys',
  'Composition',
  'Default',
  'Sizes',
  'Emphasis'
]

describe('On this page', () => {
  for (const into of ['heading', 'example'] as const) {
    it(`highlights the section scrolled to its ${into}, down, up and in jumps`, async () => {
      const page = await open('/components/kbd/', 1280)
      const seen = []
      for (const section of jumps) {
        await scrollTo(page, section, into)
        seen.push(await activeHeading(page, section))
      }
      expect(seen).toEqual(jumps)
      await page.context().close()
    }, 120_000)
  }

  it('highlights the section in the drawer on a phone', async () => {
    const page = await open('/components/kbd/', 390)
    for (const section of ['Composition', 'Keys']) {
      await scrollTo(page, section, 'example')
      await page.waitForTimeout(500)
      await page.getByRole('button', { name: 'On this page' }).click()
      expect(await activeHeading(page, section)).toBe(section)
      await page.keyboard.press('Escape')
      await nav(page).waitFor({ state: 'hidden' })
    }
    await page.context().close()
  }, 60_000)
})
