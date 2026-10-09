import { readFile } from 'fs/promises'
import { join } from 'path'
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

async function open(width: number, dark = false) {
  const context = await browser.newContext({
    viewport: { width, height: 900 },
    colorScheme: dark ? 'dark' : 'light'
  })
  await serveExport(context)
  const page = await context.newPage()
  await page.goto(`${ORIGIN}${BASE_PATH}/foundations/elevation/`)
  await page.waitForLoadState('networkidle')
  if (dark)
    await page.evaluate(() => document.documentElement.classList.add('dark'))
  return page
}

// The page's tables name these, so a token that goes missing fails here.
const SHADOWS = [
  'shadow-xs',
  'shadow-sm',
  'shadow-md',
  'shadow-lg',
  'shadow-xl',
  'shadow-2xl'
]
const INSET_SHADOWS = ['inset-shadow-xs', 'inset-shadow-sm']
const RIM_LIGHTS = [
  'rim-light-subtler',
  'rim-light-subtle',
  'rim-light-normal',
  'rim-light-strong'
]
const TIERS = [
  'z-alert',
  'z-tooltip',
  'z-toast',
  'z-popover',
  'z-modal',
  'z-overlay',
  'z-sticky',
  'z-docked',
  'z-base',
  'z-hide'
]

/** Each tile's label and shadow, beside the shadow its own Tailwind utility gives a probe. */
async function shadowTiles(page: Page, slot: string) {
  const scale = page.locator(`[data-slot=${slot}]`)
  await scale.scrollIntoViewIfNeeded()
  return scale.locator('li').evaluateAll((items) =>
    items.map((item) => {
      const utility = item.querySelector('code')!.textContent!
      const swatch = item.querySelector('[data-slot$=swatch]')!
      const probe = document.createElement('div')
      probe.className = utility
      swatch.parentElement!.append(probe)
      const fromUtility = getComputedStyle(probe).boxShadow
      probe.remove()
      return {
        utility,
        shadow: getComputedStyle(swatch).boxShadow,
        fromUtility
      }
    })
  )
}

// Tailwind's utility also stacks transparent ring and inset layers around the token.
const visibleLayers = (shadow: string) =>
  shadow
    .split(/,(?![^(]*\))/)
    .map((layer) => layer.trim())
    .filter((layer) => !/^(rgba\(0, 0, 0, 0\)|transparent)\s/.test(layer))
    .filter((layer) => !/\s(rgba\(0, 0, 0, 0\)|transparent)$/.test(layer))

describe('Elevation foundation', () => {
  for (const dark of [false, true]) {
    const mode = dark ? 'dark' : 'light'

    it(`renders every shadow level as its utility does, in ${mode} mode`, async () => {
      const page = await open(1280, dark)
      for (const [slot, names] of [
        ['shadow-scale', SHADOWS],
        ['inset-shadow-scale', INSET_SHADOWS]
      ] as const) {
        const tiles = await shadowTiles(page, slot)
        expect(tiles.map((tile) => tile.utility)).toEqual(names)
        for (const tile of tiles) {
          expect(tile.shadow, tile.utility).not.toBe('none')
          expect(visibleLayers(tile.shadow), tile.utility).toEqual(
            visibleLayers(tile.fromUtility)
          )
        }
        const distinct = new Set(tiles.map((tile) => tile.shadow))
        expect(distinct.size).toBe(tiles.length)
      }
    }, 60_000)
  }

  it('renders the four rim light levels over a medium shadow', async () => {
    const page = await open(1280)
    const scale = page.locator('[data-slot=rim-light-scale]')
    await scale.scrollIntoViewIfNeeded()
    const tiles = await scale.locator('li').evaluateAll((items) =>
      items.map((item) => ({
        name: item.querySelector('code')!.textContent,
        shadow: getComputedStyle(
          item.querySelector('[data-slot=rim-light-swatch]')!
        ).boxShadow
      }))
    )
    expect(tiles.map((tile) => tile.name)).toEqual(RIM_LIGHTS)
    for (const tile of tiles) expect(tile.shadow, tile.name).toMatch(/inset/)
    expect(new Set(tiles.map((tile) => tile.shadow)).size).toBe(tiles.length)
  }, 60_000)

  for (const width of [375, 1280]) {
    it(`lists every layering tier, top first, with the value its utility sets, at ${width}px`, async () => {
      const page = await open(width)
      const scale = page.locator('[data-slot=layering-scale]')
      await scale.scrollIntoViewIfNeeded()
      const tiers = await scale
        .locator('[data-slot=layering-tier]')
        .evaluateAll((items) =>
          items.map((item) => {
            const utility = item.querySelector('code')!.textContent!
            const probe = document.createElement('div')
            probe.className = `relative ${utility}`
            item.append(probe)
            const zIndex = getComputedStyle(probe).zIndex
            probe.remove()
            return {
              utility,
              shown: item.querySelector('span')!.textContent,
              zIndex
            }
          })
        )
      expect(tiers.map((tier) => tier.utility)).toEqual(TIERS)
      for (const tier of tiers)
        expect(tier.shown, tier.utility).toBe(tier.zIndex)
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth
      )
      expect(overflow).toBe(0)
    }, 60_000)
  }

  it('describes each scale in its markdown copy without pointing at the tiles it drops', async () => {
    const markdown = await readFile(
      join(import.meta.dirname, '../out/foundations/elevation.md'),
      'utf-8'
    )
    for (const heading of [
      'Shadow scale',
      'Inset shadows',
      'Rim light',
      'Layering'
    ]) {
      const section = markdown.split(`## ${heading}\n`)[1]!.split('\n## ')[0]!
      expect(section, heading).not.toMatch(/\b(below|above)\b/i)
    }
  })
})
