import { readFile } from 'fs/promises'
import { join } from 'path'
import { type Browser, type Locator, chromium, firefox, webkit } from 'playwright'
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

async function open(width = 1280) {
  const context = await browser.newContext({ viewport: { width, height: 900 } })
  await serveExport(context)
  const page = await context.newPage()
  await page.goto(`${ORIGIN}${BASE_PATH}/foundations/records/`)
  await page.waitForLoadState('networkidle')
  return page
}

/** A code block's full text; a long one renders only its first lines until opened. */
async function codeIn(block: Locator) {
  await block.scrollIntoViewIfNeeded()
  const viewCode = block.getByRole('button', { name: 'View code' })
  if (await viewCode.count()) await viewCode.click()
  return block.locator('pre').innerText()
}

/** The value a call returns, from the comment lines the page prints under it. */
function commentedResult(code: string) {
  const comments = code
    .split('\n')
    .filter((line) => line.startsWith('// '))
    .map((line) => line.slice(3))
  return JSON.parse(comments.join('\n'))
}

describe('Records foundation', () => {
  it('works out the view as Meilisearch parameters for the weekend at hand', async () => {
    const page = await open()
    const code = await codeIn(page.locator('[data-slot=view-meilisearch]'))
    expect(code).toContain("now: new Date('2026-10-02T13:30:00Z')")
    const { q, filter, sort } = commentedResult(code)
    expect(q).toBe('lampshade')
    expect(filter).toHaveLength(3)
    expect(filter[0]).toMatch(/city.*melbourne/)
    // 11:30pm Friday in Melbourne, so this weekend is 3 and 4 October.
    expect(filter[1]).toMatch(/startsLocal/)
    expect(filter[1]).toMatch(/2026-10-03/)
    expect(filter[1]).toMatch(/2026-10-04/)
    expect(filter[2]).toMatch(/offer.*sold_out/)
    expect(sort).toEqual(['starts:asc'])
  }, 60_000)

  it('reads typed text into a city chip, with the date phrase left over', async () => {
    const page = await open()
    const suggestions: { kind: string; label: string; remainder: string }[] =
      commentedResult(await codeIn(page.locator('[data-slot=query-suggestions]')))
    expect(suggestions.length).toBeGreaterThan(1)
    expect(suggestions.length).toBeLessThanOrEqual(4)
    expect(suggestions).toContainEqual({
      kind: 'filter',
      label: 'City is Melbourne',
      remainder: 'this weekend'
    })
    for (const { kind } of suggestions) expect(['filter', 'field']).toContain(kind)
  }, 60_000)

  it('writes the view shown on the page as the URL the key table describes', async () => {
    const page = await open()
    const view = JSON.parse(
      await codeIn(
        page.locator('#docs-content div:has(> pre)', { hasText: '"query"' }).first()
      )
    )
    const params = (await codeIn(page.locator('[data-slot=view-search-params]')))
      .trim()
      .split('\n')
      .map((line) => line.split('='))
    expect(params).toEqual([
      ['v', '1'],
      ['view', view.id],
      ['entity', view.entity],
      ['q', view.query.search],
      ['f', 'city:is:melbourne'],
      ['f', 'starts:within:this-weekend'],
      ['f', 'offer:is-not:sold_out'],
      ['sort', 'starts'],
      ['layout', 'table'],
      ['columns', 'name,gross,starts'],
      ['hidden', 'created'],
      ['page', '1']
    ])
    const keys = await page
      .locator('table', { has: page.getByRole('columnheader', { name: 'Holds' }) })
      .locator('tbody td:first-child code')
      .allTextContents()
    for (const [key] of params) expect(keys).toContain(key)
  }, 60_000)

  it('fits a phone without scrolling sideways', async () => {
    const page = await open(375)
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth
    )
    expect(overflow).toBe(0)
  }, 60_000)

  it('describes each output in its markdown copy without pointing at what it drops', async () => {
    const markdown = await readFile(
      join(import.meta.dirname, '../out/foundations/records.md'),
      'utf-8'
    )
    for (const heading of ['Browser and server', 'Typed text', 'URL format']) {
      const section = markdown.split(`## ${heading}\n`)[1]!.split('\n## ')[0]!
      expect(section, heading).toMatch(/On the docs site/)
      expect(section, heading).not.toMatch(/\b(below|above)\b/i)
    }
  })
})
