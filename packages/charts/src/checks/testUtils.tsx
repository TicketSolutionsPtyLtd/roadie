import type { ReactElement } from 'react'

import { cleanup, render } from '@testing-library/react'
import axe from 'axe-core'
import { afterAll, beforeAll, expect } from 'vitest'
import { page } from 'vitest/browser'

import {
  apcaLc,
  flatten,
  isPainted,
  minimumLc
} from '@oztix/roadie-browser-testing/contrast'

import roadieCss from '../../vitest.browser.css?inline'
import { BarChart } from '../BarChart'
import { scanRateExample } from '../BarChart/examples'
import { Chart } from '../Chart'
import { LineChart } from '../LineChart'
import { paceExample, salesByTypeExample } from '../LineChart/examples'
import { RankedBars } from '../RankedBars'
import { channelExample } from '../RankedBars/examples'
import { StackedBars } from '../StackedBars'
import { ticketMixExample } from '../StackedBars/examples'
import { afterResize } from '../plot/browserTesting'
import { loadBrandFont, useStylesheet } from '../testUtils'

// The same checks as packages/components/src/checks, which this package can't
// import: its tsconfig's rootDir is src. Chart text is all under 14px, so
// decision 0010's short label row never applies and it's measured as body text.

const STILL = `
  *, *::before, *::after { transition: none !important; animation: none !important }
  html, body { height: 100%; margin: 0 }
`

export const widths = [
  { name: 'phone', width: 390, height: 844 },
  { name: 'desktop', width: 1280, height: 800 }
] as const

export const themes = ['light', 'dark'] as const

type Theme = (typeof themes)[number]

type Scenario = {
  name: string
  ui: () => ReactElement
  /** Brings the chart to this state once drawn. */
  reach?: () => Promise<unknown>
}

const inCard = (plot: ReactElement) => (
  <Chart label='Ticket sales' source='Oztix sales.' size='md'>
    {plot}
  </Chart>
)

// Focus lands on the first point, which opens its tooltip.
async function showTooltip() {
  document.querySelector<SVGElement>('svg.ts-chart')!.focus()
  await expect
    .poll(() => document.querySelector('[data-slot=chart-plot-tooltip]'))
    .not.toBeNull()
}

export const scenarios: Scenario[] = [
  { name: 'line-chart', ui: () => inCard(<LineChart {...paceExample} />) },
  {
    name: 'line-chart-tooltip',
    ui: () => inCard(<LineChart {...salesByTypeExample} />),
    reach: showTooltip
  },
  { name: 'bar-chart', ui: () => inCard(<BarChart {...scanRateExample} />) },
  { name: 'ranked-bars', ui: () => inCard(<RankedBars {...channelExample} />) },
  {
    name: 'stacked-bars',
    ui: () => inCard(<StackedBars {...ticketMixExample} />)
  }
]

export function setUpCheckPage() {
  let removeStylesheets = () => {}
  beforeAll(async () => {
    const removeRoadie = useStylesheet(roadieCss)
    const removeStill = useStylesheet(STILL)
    removeStylesheets = () => {
      removeRoadie()
      removeStill()
    }
    await loadBrandFont()
  })
  afterAll(async () => {
    removeStylesheets()
    document.documentElement.classList.remove('dark')
    await page.viewport(1920, 1080)
  })
}

export async function showScenario(
  scenario: Scenario,
  theme: Theme,
  { width, height }: { width: number; height: number }
) {
  cleanup()
  await page.viewport(width, height)
  document.documentElement.classList.toggle('dark', theme === 'dark')
  render(
    <main className='grid min-h-full content-start bg-normal p-4 text-normal'>
      {scenario.ui()}
    </main>
  )
  await afterResize()
  await scenario.reach?.()
}

// Serious and critical violations that already shipped. Each leaves once its
// ticket is fixed; anything not listed fails the check.
const knownViolations: { rule: string; selector: string; ticket: string }[] = []

export async function expectNoSeriousViolations() {
  const { violations } = await axe.run(document, {
    resultTypes: ['violations'],
    // Roadie measures contrast with APCA instead (docs/decisions/0010-apca-contrast.md).
    rules: { 'color-contrast': { enabled: false } }
  })
  const found = violations
    .filter(({ impact }) => impact === 'serious' || impact === 'critical')
    .flatMap(({ id, nodes }) =>
      nodes
        .filter(
          ({ target }) =>
            !knownViolations.some(
              (known) =>
                known.rule === id &&
                document
                  .querySelector(target.join(' '))
                  ?.matches(known.selector)
            )
        )
        .map(({ html, failureSummary }) => `${id}: ${html}\n${failureSummary}`)
    )
  expect(found).toEqual([])
}

const BODY_TEXT = minimumLc['body text']

// The fill under the text, or null when something opaque covers it, such as
// the tooltip. SVG marks have no background, so a label is measured against
// the card; labels drawn over marks carry a halo in the card's colour.
function fillUnder(element: Element) {
  const { left, top, width, height } = element.getBoundingClientRect()
  const stack = document.elementsFromPoint(left + width / 2, top + height / 2)
  const at = stack.findIndex((layer) => element.contains(layer))
  if (at === -1) return null
  const above = stack.slice(0, at)
  if (above.some((layer) => isPainted(getComputedStyle(layer).backgroundColor)))
    return null
  return flatten(
    '#fff',
    ...stack
      .slice(at)
      .reverse()
      .map((layer) => getComputedStyle(layer).backgroundColor)
  )
}

function isMeasured(element: Element) {
  const { width, height } = element.getBoundingClientRect()
  return (
    width > 1 &&
    height > 1 &&
    element.checkVisibility({ opacityProperty: true, visibilityProperty: true })
  )
}

// HTML text paints with color and SVG text with fill.
const textColour = (element: Element) => {
  const style = getComputedStyle(element)
  return element instanceof SVGElement ? style.fill : style.color
}

function textOwners() {
  const owners = new Set<Element>()
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  for (let node = walker.nextNode(); node; node = walker.nextNode())
    if (node.textContent?.trim() && node.parentElement)
      owners.add(node.parentElement)
  return [...owners].filter(isMeasured)
}

type KnownLowContrast = {
  matches: (element: Element) => boolean
  /** Just under the lowest Lc measured when listed, so a worse pair fails. */
  floor: number
  theme?: Theme
  ticket: string
}

// Text under body text's minimum that already shipped. Each leaves once its
// ticket is fixed; anything not listed fails the check.
const knownLowContrast: KnownLowContrast[] = []

const currentTheme = (): Theme =>
  document.documentElement.classList.contains('dark') ? 'dark' : 'light'

/** Asserts all text meets body text's Lc 75 (docs/decisions/0010-apca-contrast.md). */
export function expectApcaContrast() {
  const force = document.createElement('style')
  force.textContent = '* { pointer-events: auto !important }'
  document.head.append(force)
  try {
    const failures = textOwners().flatMap((element) => {
      const surface = fillUnder(element)
      if (!surface) return []
      const lc = Math.abs(
        apcaLc(flatten(`rgb(${surface.join()})`, textColour(element)), surface)
      )
      const known = knownLowContrast.some(
        (entry) =>
          lc >= entry.floor &&
          (entry.theme ?? currentTheme()) === currentTheme() &&
          entry.matches(element)
      )
      if (lc >= BODY_TEXT || known) return []
      return [
        `body text needs Lc ${BODY_TEXT}, has ${lc.toFixed(1)}: "${element.textContent?.trim().slice(0, 40)}" in ${element.outerHTML.slice(0, 120)}`
      ]
    })
    expect(failures).toEqual([])
  } finally {
    force.remove()
  }
}
