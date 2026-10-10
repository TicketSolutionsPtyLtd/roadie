import { readFile } from 'fs/promises'
import { join } from 'path'
import { type Browser, chromium, firefox, webkit } from 'playwright'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import { BASE_PATH, ORIGIN, serveExport } from './serveExport'

// Each rendered docs component, by page and slot, against the markdown twin
// the build wrote for that page. A component that draws a list rather than a
// table marks its rows `data-twin-row` and their cells `data-twin-cell`.
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
  ].map((slot): [string, string] => ['/foundations/date-and-time', slot]),
  ['/foundations/elevation', 'layering-scale'],
  ['/foundations/iconography', 'icon-size-scale'],
  ['/foundations/interactions', 'focus-ring-list'],
  ['/foundations/interactions', 'transition-list'],
  ['/foundations/layout', 'breakpoint-scale'],
  ['/foundations/layout', 'container-scale'],
  ['/foundations/layout', 'spacing-scale'],
  ['/foundations/shape', 'radius-scale'],
  ['/foundations/theming', 'accent-scales'],
  ['/foundations/typography', 'rhythm-table'],
  ['/foundations/typography', 'type-scale']
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
      const { listed, rows } = await page
        .locator(`[data-slot=${slot}]`)
        .evaluate((root) => {
          const listed = !root.querySelector('tr')
          const rows = root.querySelectorAll(listed ? '[data-twin-row]' : 'tr')
          return {
            listed,
            rows: [...rows].map((row) =>
              [
                ...row.querySelectorAll(listed ? '[data-twin-cell]' : 'th, td')
              ].map((cell) => {
                if (cell.matches('code')) return `\`${cell.textContent}\``
                const copy = cell.cloneNode(true) as Element
                for (const code of copy.querySelectorAll('code'))
                  code.replaceWith(`\`${code.textContent}\``)
                return copy.textContent!.trim()
              })
            )
          }
        })
      expect(rows.length).toBeGreaterThan(1)
      // A list has no header row, so it matches a table's body.
      const tables = markdownTables(await twin(route)).map((table) =>
        listed ? table.slice(1) : table
      )
      expect(tables).toContainEqual(rows)
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

  it.each(['categorical', 'heat', 'diverging', 'status'])(
    '/foundations/colors %s dataviz swatches',
    async (kind) => {
      const page = await open('/foundations/colors')
      const panel = (mode: string) =>
        page
          .locator(
            `[data-slot=dataviz-swatches][data-kind=${kind}] [data-mode=${mode}] [data-slot=dataviz-swatch]`
          )
          .evaluateAll((swatches) =>
            swatches.map((swatch) => [
              swatch.getAttribute('title')!,
              getComputedStyle(swatch).backgroundColor
            ])
          )
      const [light, dark] = await Promise.all([panel('light'), panel('dark')])
      expect(light.length, kind).toBeGreaterThan(0)
      const rgb = (hex: string) =>
        `rgb(${[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(', ')})`
      const table = markdownTables(await twin('/foundations/colors')).find(
        (rows) => rows[1]?.[0] === `\`${light[0]![0]}\``
      )
      expect(table, kind).toBeDefined()
      expect(table!.slice(1)).toEqual(
        light.map(([token, color], i) => {
          const row = table![i + 1]!
          expect(rgb(row[1]!.slice(1, -1))).toBe(color)
          expect(rgb(row[2]!.slice(1, -1))).toBe(dark[i]![1])
          return [`\`${token}\``, row[1], row[2]]
        })
      )
    },
    60_000
  )

  it('/foundations/colors scale swatches', async () => {
    const page = await open('/foundations/colors')
    const scales = await page
      .locator('[data-slot=scale-swatches] > li')
      .evaluateAll((items) =>
        items.map((item) => {
          const steps = [...item.querySelectorAll('[data-slot=scale-swatch]')]
          return [
            item.querySelector('p')!.textContent!,
            `\`${steps[0]!.getAttribute('title')}\` to \`${steps.at(-1)!.getAttribute('title')}\``
          ]
        })
      )
    expect(scales.length).toBeGreaterThan(5)
    expect(markdownTables(await twin('/foundations/colors'))).toContainEqual([
      ['Scale', 'Steps'],
      ...scales
    ])
  }, 60_000)

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
