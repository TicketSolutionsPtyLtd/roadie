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
async function scrollTo(page: Page, heading: string, to: ScrollTarget) {
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

/** To the heading, just past it, or to this many pixels below the pane's top. */
type ScrollTarget = 'heading' | 'past' | number

const scrollOnce = (page: Page, heading: string, to: ScrollTarget) =>
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
      if (to !== 'heading') {
        let scroller = target.parentElement!
        while (scroller.scrollHeight <= scroller.clientHeight + 1)
          scroller = scroller.parentElement!
        const top = scroller.getBoundingClientRect().top
        const below = to === 'past' ? -40 : to
        scroller.scrollTop += target.getBoundingClientRect().top - top - below
      }
    },
    [heading, to] as const
  )

/** Runs in the page with the pane that scrolls the docs content. */
async function withPane<T>(page: Page, run: (pane: HTMLElement) => T) {
  const pane = await page.evaluateHandle(() => {
    let pane = document.getElementById('docs-content')!.parentElement!
    while (pane.scrollHeight <= pane.clientHeight + 1)
      pane = pane.parentElement!
    return pane
  })
  return pane.evaluate(run)
}

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
    await withPane(page, (pane) => {
      pane.scrollTop = pane.scrollHeight
    })
    expect(await activeHeading(page, last!)).toBe(last)
  }, 60_000)

  // A display: none heading sits at the top of the viewport, above the line.
  it('passes over a hidden heading', async () => {
    const page = await open('/components/kbd/', 1280)
    await page
      .locator('#docs-content :is(h2, h3)', { hasText: /^Sizes$/ })
      .evaluate((heading) => {
        heading.style.display = 'none'
      })
    await scrollTo(page, 'Emphasis', 'past')
    expect(await activeHeading(page, 'Emphasis')).toBe('Emphasis')
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

  // Opening the inspector narrows the pane, which reflows the page with no scroll.
  it('moves the highlight when the page reflows without a scroll', async () => {
    const page = await open('/components/kbd/', 1280)
    await scrollTo(page, 'Keys', 'past')
    expect(await activeHeading(page, 'Keys')).toBe('Keys')
    // Without scroll anchoring, which would scroll to hold the view, the reflow fires no scroll.
    // The gap opens just above Keys, so no example comes into view to mount.
    await withPane(page, (pane) => {
      pane.style.overflowAnchor = 'none'
      const keys = [...document.querySelectorAll('#docs-content h3')].find(
        (node) => node.textContent === 'Keys'
      )!
      ;(keys.previousElementSibling as HTMLElement).style.marginBottom =
        '2000px'
    })
    expect(await activeHeading(page, 'Default')).toBe('Default')
  }, 60_000)

  it("draws the line below the pane's scroll padding", async () => {
    const page = await open('/components/kbd/', 1280)
    await withPane(page, (pane) => {
      pane.style.scrollPaddingTop = '300px'
    })
    // The padding is read again when the pane resizes.
    await page.setViewportSize({ width: 1280, height: 901 })
    await scrollTo(page, 'Keys', 340)
    expect(await activeHeading(page, 'Keys')).toBe('Keys')
  }, 60_000)

  // Next's router and history.pushState change the hash without a hashchange.
  it('lands on and highlights a hash pushed to history', async () => {
    const page = await open('/components/kbd/', 1280)
    await page.evaluate(() =>
      window.history.pushState(null, '', '#composition')
    )
    expect(await activeHeading(page, 'Composition')).toBe('Composition')
    const offset = await withPane(
      page,
      (pane) =>
        document.getElementById('composition')!.getBoundingClientRect().top -
        pane.getBoundingClientRect().top
    )
    expect(offset).toBeLessThan(60)
  }, 60_000)

  // Writing ids after render, before the page hydrated, made a hydration mismatch.
  it('renders API reference ids in the markup and lands a link to one', async () => {
    const page = await open('/components/kbd/#api-kbd', 1280)
    const html = await page.evaluate(() =>
      fetch(window.location.href).then((response) => response.text())
    )
    expect(html).toContain('id="api-reference"')
    expect(html).toContain('id="api-kbd"')
    expect(await activeHeading(page, 'Kbd')).toBe('Kbd')
  }, 60_000)
})
