import { readFile } from 'fs/promises'
import { join } from 'path'
import { type Browser, chromium, firefox, webkit } from 'playwright'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import { BASE_PATH, ORIGIN, serveExport } from './serveExport'

// Each rendered docs component, by page and slot, against the markdown twin
// the build wrote for that page.
const TABLES: [route: string, slot: string][] = [
  ['/charts/dashboards', 'card-sizes'],
  ['/charts/dashboards', 'copy-limits'],
  ['/charts/dashboards', 'chart-label-limits'],
  ['/charts/dashboards', 'period-comparisons'],
  ...[
    'comparison-table',
    'component-reads',
    'data-format-reads',
    'date-style-scale',
    'future-ladder',
    'machine-value-reads',
    'moment-reads',
    'past-ladder',
    'phrase-table',
    'range-table',
    'time-style-scale',
    'zone-table'
  ].map((slot): [string, string] => ['/foundations/date-and-time', slot])
]

const CODE: [route: string, slot: string, lang: string][] = [
  ['/foundations/records', 'query-suggestions', 'ts'],
  ['/foundations/records', 'view-meilisearch', 'ts'],
  ['/foundations/records', 'view-search-params', 'text']
]

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

async function open(route: string) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 }
  })
  await serveExport(context)
  const page = await context.newPage()
  await page.goto(`${ORIGIN}${BASE_PATH}${route}/`)
  await page.waitForLoadState('networkidle')
  return page
}

const twin = (route: string) =>
  readFile(join(import.meta.dirname, `../out${route}.md`), 'utf-8')

/** Every table in some markdown, as rows of cells with `code` kept in backticks. */
function markdownTables(markdown: string) {
  const tables: string[][][] = []
  let rows: string[][] = []
  for (const line of [...markdown.split('\n'), '']) {
    if (line.startsWith('|')) {
      if (!/^\|[\s|:-]+\|$/.test(line))
        rows.push(
          line
            .slice(1, -1)
            .split(/(?<!\\)\|/)
            .map((cell) =>
              cell.trim().replaceAll('\\|', '|').replaceAll('&lt;', '<')
            )
        )
    } else if (rows.length) {
      tables.push(rows)
      rows = []
    }
  }
  return tables
}

const fences = (markdown: string, lang: string) =>
  [
    ...markdown.matchAll(
      new RegExp(`^\`\`\`${lang}\\n([\\s\\S]*?)\\n\`\`\`$`, 'gm')
    )
  ].map(([, body]) => body)

describe('twins carry the data their pages render', () => {
  it.each(TABLES)(
    '%s %s table',
    async (route, slot) => {
      const page = await open(route)
      const rows = await page
        .locator(`[data-slot=${slot}] tr`)
        .evaluateAll((trs) =>
          trs.map((tr) =>
            [...tr.querySelectorAll('th, td')].map((cell) => {
              const copy = cell.cloneNode(true) as Element
              for (const code of copy.querySelectorAll('code'))
                code.replaceWith(`\`${code.textContent}\``)
              return copy.textContent!.trim()
            })
          )
        )
      expect(rows.length).toBeGreaterThan(1)
      expect(markdownTables(await twin(route))).toContainEqual(rows)
    },
    60_000
  )

  it.each(CODE)(
    '%s %s code',
    async (route, slot, lang) => {
      const page = await open(route)
      const block = page.locator(`[data-slot=${slot}]`)
      await block.scrollIntoViewIfNeeded()
      const viewCode = block.getByRole('button', { name: 'View code' })
      if (await viewCode.count()) await viewCode.click()
      const code = (await block.locator('pre').innerText()).trim()
      expect(fences(await twin(route), lang)).toContain(code)
    },
    60_000
  )

  it('/components/spot-illustration names', async () => {
    const page = await open('/components/spot-illustration')
    const names = await page
      .locator('[data-slot=illustration-gallery] code')
      .allTextContents()
    expect(names.length).toBeGreaterThan(10)
    const listed = [
      ...(await twin('/components/spot-illustration')).matchAll(/^- `(\w+)`$/gm)
    ].map(([, name]) => name)
    expect(listed).toEqual(names)
  }, 60_000)
})
