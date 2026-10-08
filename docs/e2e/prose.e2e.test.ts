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

/** Scrolls the live example under a heading into view and waits for it to render. */
async function renderExampleAfter(page: Page, heading: string) {
  const example = page
    .locator('#docs-content h3, #docs-content h2')
    .filter({ hasText: new RegExp(`^${heading}$`) })
    .locator(
      'xpath=following::*[@data-live-example="rendered" or @data-live-example="pending"][1]'
    )
  await example.scrollIntoViewIfNeeded()
  const rendered = page
    .locator('#docs-content h3, #docs-content h2')
    .filter({ hasText: new RegExp(`^${heading}$`) })
    .locator('xpath=following::*[@data-live-example="rendered"][1]')
  await rendered.waitFor()
  return rendered
}

const DOCS_BODY_SIZE = 20
const FLOW = 1.25 * DOCS_BODY_SIZE

describe('Docs MDX in .prose', () => {
  it('starts the first block flush under the page title', async () => {
    const page = await open('/components/badge/', 1280)
    const gap = await page.evaluate(() => {
      const prose = document.querySelector('#docs-content > .prose')!
      const above = prose.previousElementSibling!
      const first = prose.firstElementChild!
      return (
        first.getBoundingClientRect().top - above.getBoundingClientRect().bottom
      )
    })
    // The block above owns the gap: the title's or related links' mb-6.
    expect(gap).toBeCloseTo(24, 0)
  }, 60_000)

  it('sets the docs body size and spans the column', async () => {
    const page = await open('/foundations/prose/', 1280)
    const { size, width, column } = await page.evaluate(() => {
      const prose = document.querySelector('#docs-content > .prose')!
      const paragraph = prose.querySelector(':scope > p')!
      return {
        size: parseFloat(getComputedStyle(paragraph).fontSize),
        width: paragraph.getBoundingClientRect().width,
        column: prose.getBoundingClientRect().width
      }
    })
    expect(size).toBe(DOCS_BODY_SIZE)
    expect(width).toBeCloseTo(column, 0)
  }, 60_000)

  it('spaces an example one flow below the paragraph above it, and the next paragraph one flow below it', async () => {
    const page = await open('/components/prose/', 1280)
    await renderExampleAfter(page, 'Sizes')
    const { above, below } = await page.evaluate(() => {
      const heading = [...document.querySelectorAll('#docs-content h3')].find(
        (node) => node.textContent === 'Sizes'
      )!
      const intro = heading.nextElementSibling!
      const example = intro.nextElementSibling!
      const after = example.nextElementSibling!
      return {
        above:
          example.getBoundingClientRect().top -
          intro.getBoundingClientRect().bottom,
        below:
          after.getBoundingClientRect().top -
          example.getBoundingClientRect().bottom
      }
    })
    expect(above).toBeCloseTo(FLOW, 0)
    expect(below).toBeCloseTo(FLOW, 0)
  }, 60_000)

  it('ends the page one footer gap above the previous and next links', async () => {
    const page = await open('/overview/getting-started/', 1280)
    const gap = await page.evaluate(() => {
      const prose = document.querySelector('#docs-content > .prose')!
      const footer = prose.nextElementSibling!
      return (
        footer.getBoundingClientRect().top -
        prose.lastElementChild!.getBoundingClientRect().bottom
      )
    })
    // The footer's own mt-12, with no margin below the last block.
    expect(gap).toBeCloseTo(48, 0)
  }, 60_000)

  it('keeps a live example’s own styles inside the docs prose', async () => {
    const page = await open('/components/card/', 1280)
    const example = await renderExampleAfter(page, 'Default')
    const description = example.getByText(
      'Live at Clockwork Wattle Brewery, Brisbane'
    )
    expect(
      await description.evaluate((node) => getComputedStyle(node).marginTop)
    ).toBe('0px')
  }, 60_000)

  it('typesets a guideline’s guidance and keeps its heading gap', async () => {
    const page = await open('/components/avatar/', 1280)
    const guideline = page
      .locator('[data-slot=guideline]')
      .filter({ hasText: 'Always pass a name' })
    await guideline.scrollIntoViewIfNeeded()
    const { gap, code } = await guideline.evaluate((node) => {
      const [header, cards] = [node.firstElementChild!, node.lastElementChild!]
      const inline = [...cards.querySelectorAll('code')].find(
        (element) => element.textContent === 'name'
      )!
      return {
        gap:
          cards.getBoundingClientRect().top -
          header.getBoundingClientRect().bottom,
        code: parseFloat(getComputedStyle(inline).paddingLeft)
      }
    })
    // The guideline's own gap-2, with no heading margin from the sheet.
    expect(gap).toBeCloseTo(8, 0)
    expect(code).toBeGreaterThan(0)
  }, 60_000)

  it('styles a Prose demo inside a docs example', async () => {
    const page = await open('/components/prose/', 1280)
    const example = await renderExampleAfter(page, 'Default')
    const styles = await example.evaluate((node) => {
      const demo = node.querySelector('.prose')!
      const style = (selector: string) =>
        getComputedStyle(demo.querySelector(selector)!)
      return {
        list: style('ul').listStyleType,
        link: style('a').textDecorationLine,
        heading: parseFloat(style('h3').marginTop),
        code: parseFloat(style('pre ~ * code, p code').paddingLeft)
      }
    })
    expect(styles.list).toBe('disc')
    expect(styles.link).toBe('underline')
    expect(styles.heading).toBeGreaterThan(0)
    expect(styles.code).toBeGreaterThan(0)
  }, 60_000)

  it('styles a raw .prose demo on the foundation page, and keeps its code panel out of the docs prose', async () => {
    const page = await open('/foundations/prose/', 1280)
    const example = page.locator('[data-live-example=rendered]').first()
    await example.waitFor()
    const styles = await example.evaluate((node) => {
      const demo = node.querySelector('.prose')!
      const panel = node.parentElement!.querySelector('pre[role=group]')!
      return {
        nested: getComputedStyle(demo.querySelector('ul ul')!).listStyleType,
        kbd: getComputedStyle(demo.querySelector('kbd')!).borderTopWidth,
        panel: getComputedStyle(panel).borderTopLeftRadius
      }
    })
    expect(styles.nested).toBe('circle')
    expect(styles.kbd).toBe('1px')
    expect(styles.panel).toBe('0px')
  }, 60_000)

  it('scrolls a wide docs table inside .prose-scroll on a phone', async () => {
    const page = await open('/components/pane/', 375)
    const { scroller, overflow, column } = await page.evaluate(() => {
      const scroller = [
        ...document.querySelectorAll('#docs-content > .prose > .prose-scroll')
      ].find((node) => node.querySelector('th')?.textContent === 'Size')!
      const content = document.getElementById('docs-content')!
      return {
        scroller: scroller.scrollWidth - scroller.clientWidth,
        overflow: getComputedStyle(scroller).overflowX,
        column: content.scrollWidth - content.clientWidth
      }
    })
    expect(overflow).toBe('auto')
    expect(scroller).toBeGreaterThan(0)
    expect(column).toBe(0)
  }, 60_000)
})
