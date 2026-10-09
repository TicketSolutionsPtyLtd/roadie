import {
  type Browser,
  type Locator,
  type Page,
  chromium,
  firefox,
  webkit
} from 'playwright'
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
  await page.goto(`${ORIGIN}${BASE_PATH}/foundations/interactions/`)
  await page.waitForLoadState('networkidle')
  if (dark)
    await page.evaluate(() => document.documentElement.classList.add('dark'))
  return page
}

// `is-interactive` animates these, in this order, so a property that goes missing fails here.
const TRANSITIONED = [
  'background-color',
  'border-color',
  'color',
  'box-shadow',
  'outline-width',
  'outline-color',
  'transform'
]
const FOCUS_RING = [
  '--focus-ring-width',
  '--focus-ring-opacity',
  '--focus-ring-opacity-dark'
]

/** A live example's element, once its fence has rendered. */
async function example(page: Page, heading: string, element: Locator) {
  await page.locator(`#${heading}`).scrollIntoViewIfNeeded()
  await element.scrollIntoViewIfNeeded()
  return element
}

const seconds = (ms: string) => `${parseFloat(ms) / 1000}s`

const alpha = (colour: string) =>
  Number(/\/\s*([\d.]+)\s*\)$/.exec(colour)?.[1] ?? 1)

/** What a probe resolves a CSS colour to, in the page's current mode. */
const resolveColour = (page: Page, value: string) =>
  page.evaluate((value) => {
    const probe = document.createElement('div')
    probe.style.color = value
    document.body.append(probe)
    const colour = getComputedStyle(probe).color
    probe.remove()
    return colour
  }, value)

describe('Interactions foundation', () => {
  for (const width of [375, 1280]) {
    it(`lists each transition is-interactive runs, with its duration and easing, at ${width}px`, async () => {
      const page = await open(width)
      const list = page.locator('[data-slot=transition-list]')
      await list.scrollIntoViewIfNeeded()
      const rows = await list
        .locator('[data-slot=transition-row]')
        .evaluateAll((items) =>
          items.map((item) => ({
            property: item.querySelector('code')!.textContent!,
            duration: item.querySelector('[data-slot=transition-duration]')!
              .textContent!,
            easing: item.querySelector('[data-slot=transition-easing]')!
              .textContent!
          }))
        )
      expect(rows.map(({ property }) => property)).toEqual(TRANSITIONED)

      const button = await example(
        page,
        'is-interactive',
        page.getByRole('button', { name: 'Buy tickets' }).first()
      )
      const transition = await button.evaluate((element) => {
        const style = getComputedStyle(element)
        const easing = (name: string) => {
          const probe = document.createElement('div')
          probe.style.transitionTimingFunction = `var(--${name})`
          element.parentElement!.append(probe)
          const value = getComputedStyle(probe).transitionTimingFunction
          probe.remove()
          return value
        }
        return {
          properties: style.transitionProperty.split(', '),
          durations: style.transitionDuration.split(', '),
          easings: style.transitionTimingFunction.split(/,\s(?![^(]*\))/),
          resolve: ['ease-standard', 'ease-spring'].map((name) => [
            name,
            easing(name)
          ])
        }
      })
      const easings = Object.fromEntries(transition.resolve)
      expect(transition.properties).toEqual(TRANSITIONED)
      rows.forEach(({ property, duration, easing }, index) => {
        expect(transition.durations[index], property).toBe(seconds(duration))
        expect(easings[easing], property).toBeDefined()
        expect(transition.easings[index], property).toBe(easings[easing])
      })

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth
      )
      expect(overflow).toBe(0)
    }, 60_000)
  }

  for (const dark of [false, true]) {
    const mode = dark ? 'dark' : 'light'

    it(`draws the focus ring at the listed width and opacity, in ${mode} mode`, async () => {
      const page = await open(1280, dark)
      const list = page.locator('[data-slot=focus-ring-list]')
      await list.scrollIntoViewIfNeeded()
      const values = Object.fromEntries(
        await list
          .locator('[data-slot=focus-ring-row]')
          .evaluateAll((rows) =>
            rows.map((row) => [
              row.getAttribute('data-token')!,
              row.querySelector('[data-slot=focus-ring-value]')!.textContent!
            ])
          )
      )
      expect(Object.keys(values)).toEqual(FOCUS_RING)

      const button = await example(
        page,
        'is-interactive',
        page.getByRole('button', { name: 'Danger' })
      )
      await button.focus()
      await expect
        .poll(() =>
          button.evaluate((element) => ({
            focusVisible: element.matches(':focus-visible'),
            width: getComputedStyle(element).outlineWidth
          }))
        )
        .toEqual({ focusVisible: true, width: values['--focus-ring-width'] })
      const opacity =
        parseFloat(
          values[dark ? '--focus-ring-opacity-dark' : '--focus-ring-opacity']!
        ) / 100
      await expect
        .poll(() =>
          button.evaluate((element) => getComputedStyle(element).outlineColor)
        )
        .toSatisfy((colour: string) => Math.abs(alpha(colour) - opacity) < 0.01)
    }, 60_000)

    it(`colours a field as the state table says, in ${mode} mode`, async () => {
      const page = await open(1280, dark)
      const table = page.locator('table', {
        has: page.locator('th', { hasText: 'Outline' })
      })
      await table.scrollIntoViewIfNeeded()
      const rows = Object.fromEntries(
        await table.locator('tbody tr').evaluateAll((trs) =>
          trs.map((tr) => {
            const [state, background, border] = [...tr.querySelectorAll('td')]
              .slice(0, 3)
              .map((td) => td.textContent!.trim())
            return [state!, { background: background!, border: border! }]
          })
        )
      )
      expect(Object.keys(rows)).toEqual(['Rest', 'Hover', 'Focus', 'Invalid'])

      // "neutral-3 (neutral-2 in dark)" names the light step, then the dark one.
      const step = (cell: string) => {
        const [light, darkStep] = [...cell.matchAll(/\b([a-z]+-\d+)\b/g)].map(
          ([, name]) => name!
        )
        return `var(--color-${dark ? (darkStep ?? light) : light})`
      }
      const colours = async (field: Locator) =>
        field.evaluate((element) => {
          const style = getComputedStyle(element)
          return {
            background: style.backgroundColor,
            border: style.borderTopColor
          }
        })
      const expected = async (state: string) => ({
        background: await resolveColour(page, step(rows[state]!.background)),
        border: await resolveColour(page, step(rows[state]!.border))
      })

      const field = await example(
        page,
        'is-interactive-field',
        page.getByRole('textbox', { name: 'Name' })
      )
      await field.hover()
      await expect.poll(() => colours(field)).toEqual(await expected('Hover'))
      await field.focus()
      await page.mouse.move(0, 0)
      await expect.poll(() => colours(field)).toEqual(await expected('Focus'))

      const invalid = page.getByRole('textbox', { name: 'Email' })
      await expect
        .poll(() => colours(invalid))
        .toEqual(await expected('Invalid'))
    }, 60_000)
  }
})
