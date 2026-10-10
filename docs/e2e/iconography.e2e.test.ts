import { readFile } from 'fs/promises'
import { join } from 'path'
import { type Browser, chromium, firefox, webkit } from 'playwright'
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

async function open(width: number) {
  const context = await browser.newContext({ viewport: { width, height: 900 } })
  await serveExport(context)
  const page = await context.newPage()
  await page.goto(`${ORIGIN}${BASE_PATH}/foundations/iconography/`)
  await page.waitForLoadState('networkidle')
  return page
}

const TIERS = [
  { className: 'size-3', px: 12 },
  { className: 'size-4', px: 16 },
  { className: 'size-5', px: 20 },
  { className: 'size-6', px: 24 }
]

describe('Iconography foundation', () => {
  for (const width of [375, 1280]) {
    it(`draws each size tier at its class and labelled size at ${width}px`, async () => {
      const page = await open(width)
      const scale = page.locator('[data-slot=icon-size-scale]')
      await scale.scrollIntoViewIfNeeded()
      const rows = await scale
        .locator('[data-slot=icon-size]')
        .evaluateAll((items) =>
          items.map((item) => {
            const icon = item.querySelector('svg')!.getBoundingClientRect()
            const box = item.getBoundingClientRect()
            return {
              className: item.querySelector('code')!.textContent,
              label: item.querySelector('code + span')!.textContent,
              iconWidth: icon.width,
              iconHeight: icon.height,
              right: box.right
            }
          })
        )
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth
      )

      expect(rows.map((row) => row.className)).toEqual(
        TIERS.map((tier) => tier.className)
      )
      TIERS.forEach((tier, index) => {
        const row = rows[index]!
        expect(row.label).toBe(`${tier.px}px`)
        expect(row.iconWidth).toBeCloseTo(tier.px, 0)
        expect(row.iconHeight).toBeCloseTo(tier.px, 0)
        expect(row.right).toBeLessThanOrEqual(width)
      })
      expect(overflow).toBe(0)
    }, 60_000)
  }

  it('gives every rendered size a tier in the guidance table', async () => {
    const page = await open(1280)
    const classes = await page
      .locator('#docs-content table')
      .first()
      .locator('tbody tr td:nth-child(2)')
      .allTextContents()

    expect(classes).toEqual(TIERS.map((tier) => tier.className))
  }, 60_000)

  it('describes the sizes in its markdown copy without pointing above or below', async () => {
    const markdown = await readFile(
      join(import.meta.dirname, '../out/foundations/iconography.md'),
      'utf-8'
    )
    const sizes = markdown.split('## Icon sizes')[1]!.split('\n## ')[0]!
    expect(sizes).not.toMatch(/\b(below|above)\b/i)
    expect(sizes).toContain('`size-4`')
  })
})
