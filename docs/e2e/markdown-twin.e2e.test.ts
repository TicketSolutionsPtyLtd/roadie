import { readFile, readdir } from 'fs/promises'
import { join } from 'path'
import { type Browser, type Page, chromium, firefox, webkit } from 'playwright'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import { BASE_PATH, ORIGIN, serveExport } from './serveExport'

const OUT_DIR = join(import.meta.dirname, '../out')

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
  const context = await browser.newContext()
  await serveExport(context)
  const page = await context.newPage()
  await page.goto(`${ORIGIN}${BASE_PATH}${path}`)
  await page.waitForLoadState('networkidle')
  return page
}

const fetchText = (page: Page, path: string) =>
  page.evaluate(async (url) => (await fetch(url)).text(), `${BASE_PATH}${path}`)

const alternateOf = (html: string) =>
  html
    .split('</head>')[0]!
    .match(/<link[^>]*type="text\/markdown"[^>]*>/)?.[0]
    .match(/href="([^"]+)"/)?.[1]

describe('Markdown twins', () => {
  it('points every exported page that has a twin at it, and no other page', async () => {
    const files = await readdir(OUT_DIR, { recursive: true })
    const twins = new Set(
      files
        .filter((file) => file.endsWith('.md'))
        .map((file) => `/${file.replace(/\.md$/, '')}`)
    )
    expect(twins.size).toBeGreaterThan(50)
    for (const file of files.filter((file) => file.endsWith('index.html'))) {
      const route = `/${file.replace(/\/?index\.html$/, '')}`
      const html = await readFile(join(OUT_DIR, file), 'utf-8')
      expect(alternateOf(html), route).toBe(
        twins.has(route) ? `${BASE_PATH}${route}.md` : undefined
      )
    }
  })

  it('links a page with a twin to its markdown and llms.txt', async () => {
    const page = await open('/foundations/colors/')
    const line = page.locator('[data-slot=markdown-twin]')
    await expect
      .poll(() =>
        line
          .getByRole('link')
          .evaluateAll((links) =>
            links.map((link) => [link.textContent, link.getAttribute('href')])
          )
      )
      .toEqual([
        ['This page as Markdown', `${BASE_PATH}/foundations/colors.md`],
        ['llms.txt', `${BASE_PATH}/llms.txt`]
      ])
    expect(await fetchText(page, '/foundations/colors.md')).toMatch(
      /^# Colors\n/
    )
  }, 60_000)

  it('links only llms.txt from a page with no twin', async () => {
    const page = await open('/tokens/')
    await expect
      .poll(() =>
        page
          .locator('[data-slot=markdown-twin]')
          .getByRole('link')
          .allTextContents()
      )
      .toEqual(['llms.txt'])
    expect(await fetchText(page, '/llms.txt')).toMatch(/^# Roadie\n/)
  }, 60_000)

  it('follows client navigation, updating or dropping the head link', async () => {
    const page = await open('/foundations/colors/')
    const alternate = page.locator('head link[type="text/markdown"]')
    await expect
      .poll(() => alternate.getAttribute('href'))
      .toBe(`${BASE_PATH}/foundations/colors.md`)
    // A full reload would clear this, so it proves the router navigated.
    await page.evaluate(() => Object.assign(window, { clientNavigation: true }))

    await page
      .getByRole('link', { name: 'Elevation', exact: true })
      .first()
      .click()
    await page.waitForURL(/\/foundations\/elevation\/?$/)
    await expect
      .poll(() => alternate.getAttribute('href'))
      .toBe(`${BASE_PATH}/foundations/elevation.md`)

    await page
      .getByRole('link', { name: 'Tokens', exact: true })
      .first()
      .click()
    await page.waitForURL(/\/tokens\/?$/)
    await expect.poll(() => alternate.count()).toBe(0)
    expect(await page.evaluate(() => 'clientNavigation' in window)).toBe(true)
  }, 60_000)
})
