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

const chunksOf = async (route: string) =>
  (await readFile(join(OUT_DIR, route, 'index.html'), 'utf-8')).match(
    /\/_next\/static\/chunks\/[^"\\]+\.js/g
  ) ?? []

// The chunks a page loads that the shell doesn't, which hold its content's code.
async function pageChunks(route: string, shellRoute: string) {
  const shell = new Set(await chunksOf(shellRoute))
  return (await chunksOf(route)).filter((chunk) => !shell.has(chunk))
}

const fetchText = (page: Page, path: string) =>
  page.evaluate(async (url) => (await fetch(url)).text(), `${BASE_PATH}${path}`)

const alternateOf = (html: string) =>
  html
    .split('</head>')[0]!
    .match(/<link[^>]*type="text\/markdown"[^>]*>/)?.[0]
    .match(/href="([^"]+)"/)?.[1]

async function agentMenuLinks(page: Page) {
  await page.getByRole('button', { name: 'Use with AI' }).click()
  const menu = page.getByRole('menu')
  await menu.waitFor()
  return menu
    .getByRole('menuitem')
    .evaluateAll((items) =>
      items
        .filter((item) => item.hasAttribute('href'))
        .map((item) => [item.textContent, item.getAttribute('href')])
    )
}

// The test origin isn't secure, so the clipboard API is stubbed. Like the real one, a write rejects when its blob does.
async function openWithClipboard(path: string) {
  const context = await browser.newContext()
  await serveExport(context)
  await context.addInitScript(() => {
    const written: string[] = []
    Object.assign(window, {
      written,
      ClipboardItem: class {
        constructor(public items: Record<string, Promise<Blob>>) {}
      }
    })
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        write: async (items: { items: Record<string, Promise<Blob>> }[]) => {
          const blob = await items[0]!.items['text/plain']!
          written.push(await blob.text())
        }
      }
    })
  })
  const page = await context.newPage()
  await page.goto(`${ORIGIN}${BASE_PATH}${path}`)
  return page
}

async function copyPage(page: Page) {
  await page.getByRole('button', { name: 'Use with AI' }).click()
  await page.getByRole('menuitem', { name: 'Copy page as Markdown' }).click()
}

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

  it('links a page with a twin to its markdown and llms.txt from the header menu', async () => {
    const page = await open('/foundations/colors/')
    expect(await agentMenuLinks(page)).toEqual([
      ['View as Markdown', `${BASE_PATH}/foundations/colors.md`],
      ['llms.txt', `${BASE_PATH}/llms.txt`],
      ['Building with AI', `${BASE_PATH}/overview/ai/`]
    ])
    expect(
      await page
        .getByRole('menuitem', { name: 'Copy page as Markdown' })
        .count()
    ).toBe(1)
    expect(await fetchText(page, '/foundations/colors.md')).toMatch(
      /^# Colors\n/
    )
  }, 60_000)

  it('copies the page as markdown', async () => {
    const page = await openWithClipboard('/foundations/colors/')
    await copyPage(page)
    await page.getByText('Page copied as Markdown').waitFor()
    expect(
      await page.evaluate(
        () => (window as unknown as { written: string[] }).written[0]
      )
    ).toMatch(/^# Colors\n/)
  }, 60_000)

  it('says so when the page can’t be copied', async () => {
    const page = await openWithClipboard('/foundations/colors/')
    await page.route('**/foundations/colors.md', (route) =>
      route.fulfill({ status: 500 })
    )
    await copyPage(page)
    await page.getByText('Couldn’t copy the page').waitFor()
    expect(
      await page.evaluate(
        () => (window as unknown as { written: string[] }).written.length
      )
    ).toBe(0)
  }, 60_000)

  it('links only llms.txt and the guide from a page with no twin', async () => {
    const page = await open('/tokens/')
    expect((await agentMenuLinks(page)).map(([label]) => label)).toEqual([
      'llms.txt',
      'Building with AI'
    ])
    expect(await fetchText(page, '/llms.txt')).toMatch(/^# Roadie\n/)
  }, 60_000)

  // Code that lands after the shell hydrates leaves the pane's content dehydrated, so it client-renders.
  it('keeps one head link when the page’s own code arrives late', async () => {
    const held = await pageChunks('foundations/colors', 'tokens')
    expect(held.length).toBeGreaterThan(0)
    let release = () => {}
    const released = new Promise<void>((resolve) => (release = resolve))
    const context = await browser.newContext()
    await serveExport(context)
    await context.route(
      (url) => held.some((chunk) => url.pathname.endsWith(chunk)),
      async (route) => {
        await released
        await route.fallback()
      }
    )
    const page = await context.newPage()
    await page.goto(`${ORIGIN}${BASE_PATH}/foundations/colors/`, {
      waitUntil: 'commit'
    })
    await page
      .locator('[data-slot="navigator"][data-pending="visible"]')
      .waitFor({ state: 'attached' })
    release()

    await page.getByRole('button', { name: 'Use with AI' }).click()
    await page.getByRole('menu').waitFor()
    expect(await page.locator('head link[type="text/markdown"]').count()).toBe(
      1
    )
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
