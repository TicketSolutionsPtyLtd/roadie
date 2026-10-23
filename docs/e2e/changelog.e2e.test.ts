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

async function open(path: string) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 }
  })
  await serveExport(context)
  const page = await context.newPage()
  await page.goto(`${ORIGIN}${BASE_PATH}${path}`)
  await page.waitForLoadState('networkidle')
  return page
}

const releaseSlugs = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('[data-release]')].map(
      (section) => section.dataset.release!
    )
  )

const height = (page: Page, slug: string) =>
  page.evaluate(
    (slug) => document.getElementById(slug)!.getBoundingClientRect().height,
    slug
  )

const waitUntil = (page: Page, slug: string, state: 'rendered' | 'held') =>
  page.waitForFunction(
    ([slug, state]) => {
      const children = document.getElementById(slug)!.childElementCount
      return state === 'rendered' ? children > 0 : children === 0
    },
    [slug, state] as const,
    { timeout: 10_000 }
  )

async function scrollToTop(page: Page) {
  await page.evaluate(() => {
    let scroller = document.getElementById('docs-content')!.parentElement!
    while (scroller.scrollHeight <= scroller.clientHeight + 1)
      scroller = scroller.parentElement!
    scroller.scrollTop = 0
  })
}

describe('Changelog', () => {
  it('holds a release at its measured height once it scrolls away, for that filter only', async () => {
    const core = await open('/overview/changelog/?package=core')
    const coreSlugs = new Set(await releaseSlugs(core))
    await core.close()

    const page = await open('/overview/changelog/')
    // Far enough down that the top of the page is more than a screen away.
    const slug = (await releaseSlugs(page))
      .slice(8)
      .find((candidate) => coreSlugs.has(candidate))
    if (!slug) throw new Error('No Core release far enough down the changelog')

    await page.evaluate(
      (slug) => document.getElementById(slug)!.scrollIntoView(),
      slug
    )
    await waitUntil(page, slug, 'rendered')
    const measured = await height(page, slug)

    await scrollToTop(page)
    await waitUntil(page, slug, 'held')
    expect(await height(page, slug)).toBeCloseTo(measured, 0)

    // It hasn't rendered under Core, so it holds an estimate, not that height.
    await page.getByRole('button', { name: 'Core', exact: true }).click()
    await page.waitForURL(/package=core/)
    await waitUntil(page, slug, 'held')
    expect(await height(page, slug)).not.toBeCloseTo(measured, 0)
  }, 60_000)
})
