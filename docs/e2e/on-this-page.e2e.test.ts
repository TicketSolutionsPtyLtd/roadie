import { type Browser, type Page, chromium, firefox, webkit } from 'playwright'
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

/**
 * Scrolls the pane to a section's heading, or just past it so no heading
 * sits near the top: where a stale highlight used to stick. Examples that
 * mount around it can move it, as WebKit has no scroll anchoring, so it
 * scrolls again once they render.
 */
async function scrollTo(page: Page, heading: string, to: 'heading' | 'past') {
  await scrollOnce(page, heading, to)
  await page
    .waitForFunction(
      () =>
        ![...document.querySelectorAll('[data-live-example=pending]')].some(
          (node) => {
            const { top, bottom } = node.getBoundingClientRect()
            return bottom > -window.innerHeight && top < 2 * window.innerHeight
          }
        ),
      null,
      { timeout: 5000 }
    )
    .catch(() => {})
  await scrollOnce(page, heading, to)
}

const scrollOnce = (page: Page, heading: string, to: 'heading' | 'past') =>
  page.evaluate(
    ([heading, to]) => {
      const target = [
        ...document.querySelectorAll('#docs-content :is(h2, h3)')
      ].find(
        (node) =>
          node.textContent === heading && !node.closest('[data-live-example]')
      )
      if (!target) throw new Error(`No heading "${heading}"`)
      target.scrollIntoView()
      if (to === 'past') {
        let scroller = target.parentElement!
        while (scroller.scrollHeight <= scroller.clientHeight + 1)
          scroller = scroller.parentElement!
        const top = scroller.getBoundingClientRect().top
        scroller.scrollTop += target.getBoundingClientRect().top - top + 40
      }
    },
    [heading, to] as const
  )

const nav = (page: Page) =>
  page.getByRole('navigation', { name: 'On this page' })

const HIGHLIGHTED = 'nav[aria-label="On this page"] [aria-current="location"]'

/** The highlighted heading once it settles, or the last one seen. */
async function activeHeading(page: Page, expected: string) {
  await page
    .waitForFunction(
      ([selector, expected]) =>
        document.querySelector(selector)?.textContent === expected,
      [HIGHLIGHTED, expected] as const,
      { timeout: 2000 }
    )
    .catch(() => {})
  return page.evaluate(
    (selector) => document.querySelector(selector)?.textContent ?? null,
    HIGHLIGHTED
  )
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
  for (const to of ['heading', 'past'] as const) {
    it(`highlights the section scrolled to ${to === 'heading' ? 'its heading' : 'just past its heading'}, down, up and in jumps`, async () => {
      const page = await open('/components/kbd/', 1280)
      const seen: (string | null)[] = []
      for (const section of jumps) {
        await scrollTo(page, section, to)
        seen.push(await activeHeading(page, section))
      }
      expect(seen).toEqual(jumps)
    }, 120_000)
  }

  it('highlights the last heading once the page can scroll no further', async () => {
    const page = await open('/foundations/layout/', 1280)
    const last = await nav(page).getByRole('link').last().textContent()
    await page.evaluate(() => {
      let scroller = document.getElementById('docs-content')!.parentElement!
      while (scroller.scrollHeight <= scroller.clientHeight + 1)
        scroller = scroller.parentElement!
      scroller.scrollTop = scroller.scrollHeight
    })
    expect(await activeHeading(page, last!)).toBe(last)
  }, 60_000)

  it('follows a scroll made while a clicked heading is still landing', async () => {
    const page = await open('/components/kbd/', 1280)
    await nav(page).getByRole('link', { name: 'Default', exact: true }).click()
    await page.mouse.move(640, 450)
    await page.mouse.wheel(0, 10)
    await scrollOnce(page, 'Composition', 'past')
    expect(await activeHeading(page, 'Composition')).toBe('Composition')
  }, 60_000)

  // A fresh page per section, so closing the drawer can't race the next scroll.
  for (const section of ['Composition', 'Keys']) {
    it(`highlights ${section} in the drawer on a phone`, async () => {
      const page = await open('/components/kbd/', 390)
      await scrollTo(page, 'Announced', 'past')
      await scrollTo(page, section, 'past')
      await page.getByRole('button', { name: 'On this page' }).click()
      expect(await activeHeading(page, section)).toBe(section)
    }, 60_000)
  }
})
