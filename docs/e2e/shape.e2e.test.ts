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

const NAMED_TIERS = [
  'rounded-sm',
  'rounded-md',
  'rounded-lg',
  'rounded-xl',
  'rounded-2xl',
  'rounded-3xl',
  'rounded-4xl',
  'rounded-5xl',
  'rounded-6xl',
  'rounded-7xl',
  'rounded-full'
]

type Token = { name: string; group: string; value?: { light?: string } }

async function radiusTiers() {
  const manifest = join(
    import.meta.dirname,
    '../../packages/core/src/tokens/tokens.json'
  )
  const { tokens } = JSON.parse(await readFile(manifest, 'utf-8')) as {
    tokens: Token[]
  }
  return tokens
    .filter((token) => token.group === 'Radius' && token.name !== '--radius-xs')
    .map((token) => ({
      utility: token.name.replace('--radius-', 'rounded-'),
      px: parseFloat(token.value!.light!) * 16
    }))
}

async function renderedTiles(width: number) {
  const page = await open('/foundations/shape/', width)
  const scale = page.locator('[data-slot=radius-scale]')
  await scale.scrollIntoViewIfNeeded()
  const tiles = await scale.locator('li').evaluateAll((items) =>
    items.map((item) => {
      const swatch = item.querySelector('[data-slot=radius-swatch]')!
      const box = swatch.getBoundingClientRect()
      return {
        utility: item.querySelector('code')!.textContent,
        radius: parseFloat(getComputedStyle(swatch).borderTopLeftRadius),
        left: box.left,
        right: box.right,
        height: box.height
      }
    })
  )
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth
  )
  return { tiles, overflow }
}

describe('Shape foundation', () => {
  for (const width of [375, 1280]) {
    it(`renders every radius tier from the manifest, then rounded-full, at ${width}px`, async () => {
      const tiers = await radiusTiers()
      const { tiles, overflow } = await renderedTiles(width)

      const utilities = tiles.map((tile) => tile.utility)
      expect(utilities).toEqual([
        ...tiers.map((tier) => tier.utility),
        'rounded-full'
      ])
      // The page's tier table names these, so a manifest that loses one fails too.
      expect(utilities).toEqual(expect.arrayContaining(NAMED_TIERS))
      tiers.forEach((tier, index) => {
        expect(tiles[index]!.radius).toBeCloseTo(tier.px, 1)
      })
      const full = tiles.at(-1)!
      expect(full.radius).toBeGreaterThanOrEqual(full.height / 2)
      for (const tile of tiles) {
        expect(tile.left).toBeGreaterThanOrEqual(0)
        expect(tile.right).toBeLessThanOrEqual(width)
      }
      expect(overflow).toBe(0)
    }, 60_000)
  }

  it('names a tier for every rendered radius, in order', async () => {
    const page = await open('/foundations/shape/', 1280)
    const tiers = await page
      .locator('#docs-content table')
      .first()
      .locator('tbody tr')
      .evaluateAll((rows) =>
        rows.map((row) => {
          const [tier, utility] = row.querySelectorAll('td')
          return { tier: tier!.textContent, utility: utility!.textContent }
        })
      )

    expect(tiers.map((tier) => tier.utility)).toEqual(NAMED_TIERS)
    expect(tiers).toContainEqual({ tier: 'Panel', utility: 'rounded-3xl' })
  }, 60_000)

  it('describes the scale in its markdown copy without pointing above or below', async () => {
    const markdown = await readFile(
      join(import.meta.dirname, '../out/foundations/shape.md'),
      'utf-8'
    )
    const radiusScale = markdown.split('## Radius scale')[1]!.split('\n## ')[0]!
    expect(radiusScale).not.toMatch(/\b(below|above)\b/i)
  })
})
