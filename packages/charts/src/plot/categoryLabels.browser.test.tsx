import type { ReactElement } from 'react'

import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'

import roadieCss from '../../vitest.browser.css?inline'
import { Funnel } from '../Funnel'
import { RankedBars } from '../RankedBars'
import { StackedBars } from '../StackedBars'
import { loadBrandFont, useStylesheet } from '../testUtils'
import {
  afterResize,
  expectNoOverlap,
  nudgeFrames,
  renderInCard
} from './browserTesting'

let removeStylesheet = () => {}
beforeAll(async () => {
  removeStylesheet = useStylesheet(roadieCss)
  await loadBrandFont()
})
afterAll(() => removeStylesheet())
afterEach(() => cleanup())

const LONG = 'Kelpie Moon Festival of Bonfires and Strange Machines, 31 Oct'
const NAMES = [
  LONG,
  'Uncle Meteor and the Midnight Spoon Orchestra Live, 2 Nov',
  'Ember Galah Ball, 8 Nov',
  'Lampshade Disco, 14 Nov'
]

const charts: [string, ReactElement][] = [
  [
    'RankedBars',
    <RankedBars
      key='ranked'
      data={NAMES.map((show, i) => ({ show, perDay: 40 - i * 7 }))}
      x='show'
      y='perDay'
    />
  ],
  [
    'StackedBars',
    <StackedBars
      key='stacked'
      data={NAMES.flatMap((show, i) => [
        { show, phase: 'Presale', sold: 300 - i * 40 },
        { show, phase: 'General', sold: 500 - i * 60 }
      ])}
      x='show'
      y='sold'
      series='phase'
    />
  ],
  [
    'Funnel',
    <Funnel
      key='funnel'
      steps={NAMES.map((label, i) => ({ label, value: 5000 - i * 1000 }))}
    />
  ]
]

const WIDTHS: [string, number][] = [
  ['a 320px phone', 320],
  ['a 326px dashboard card', 326],
  ['a 390px phone', 390]
]

const LABELS = '[data-ts-key^="label-category"] text'

async function settle(plot: ReactElement, width: number) {
  const result = renderInCard(plot, { width })
  await afterResize()
  await nudgeFrames()
  await expect
    .poll(() => result.container.querySelectorAll(LABELS).length)
    .toBeGreaterThan(0)
  return result
}

// A label's own text, without its title.
const shown = (text: Element) =>
  [...text.childNodes]
    .filter((node) => node.nodeType === Node.TEXT_NODE)
    .map((node) => node.textContent)
    .join('')

const linesOf = (container: HTMLElement, name: string) =>
  [...container.querySelectorAll(LABELS)].filter(
    (text) => text.querySelector('title')?.textContent === name
  )

describe.each(charts)('%s category labels', (_, plot) => {
  it.each(WIDTHS)('stay inside %s', async (__, width) => {
    const { container } = await settle(plot, width)
    const card = container
      .querySelector('[data-slot=data-card]')!
      .getBoundingClientRect()
    const svg = container.querySelector('svg.ts-chart')!.getBoundingClientRect()
    for (const label of container.querySelectorAll(LABELS)) {
      const box = label.getBoundingClientRect()
      const name = shown(label)
      expect(box.left, `"${name}" leaves the card`).toBeGreaterThanOrEqual(
        Math.max(card.left, svg.left) - 0.5
      )
      expect(box.right, `"${name}" runs into the bars`).toBeLessThanOrEqual(
        card.right
      )
    }
  })

  it('wraps a long name to two lines, then an ellipsis', async () => {
    const { container } = await settle(plot, 320)
    const lines = linesOf(container, LONG)
    expect(lines).toHaveLength(2)
    expect(shown(lines[1]!)).toMatch(/…$/)
    const [first, second] = lines.map((line) => line.getBoundingClientRect())
    expect(second!.top).toBeGreaterThan(first!.top)
  })

  it('keeps a short name whole on one line on a wider card', async () => {
    const { container } = await settle(plot, 560)
    const lines = linesOf(container, 'Ember Galah Ball, 8 Nov')
    expect(lines.map(shown)).toEqual(['Ember Galah Ball, 8 Nov'])
  })

  it('puts the full name where the pointer finds it', async () => {
    const { container } = await settle(plot, 320)
    const [first] = linesOf(container, LONG)
    const box = first!.getBoundingClientRect()
    const hit = document.elementFromPoint(
      box.left + box.width / 2,
      box.top + box.height / 2
    )
    expect(hit?.closest('text')).toBe(first)
  })

  it('keeps the full name in the table', async () => {
    const { getByRole } = await settle(plot, 320)
    await userEvent.click(getByRole('button', { name: 'Table' }))
    expect(getByRole('table').textContent).toContain(LONG)
  })
})

describe('Category labels on tight rows', () => {
  it('cut to one line when two would collide', async () => {
    const data = [...NAMES, ...NAMES.map((name) => `${name} late show`)].map(
      (show, i) => ({ show, perDay: 80 - i * 5 })
    )
    const { container } = await settle(
      <RankedBars data={data} x='show' y='perDay' limit={8} />,
      320
    )
    expect(linesOf(container, LONG)).toHaveLength(1)
    expect(shown(linesOf(container, LONG)[0]!)).toMatch(/…$/)
  })

  it('keep all-capital names inside a 320px card', async () => {
    const data = [
      ...NAMES.map((show, i) => ({ show: show.toUpperCase(), perDay: 40 - i })),
      { show: 'W'.repeat(40), perDay: 10 },
      { show: 'MWMW '.repeat(8), perDay: 5 }
    ]
    const { container } = await settle(
      <RankedBars data={data} x='show' y='perDay' />,
      320
    )
    const svg = container.querySelector('svg.ts-chart')!.getBoundingClientRect()
    for (const label of container.querySelectorAll(LABELS))
      expect(label.getBoundingClientRect().left).toBeGreaterThanOrEqual(
        svg.left - 0.5
      )
  })

  it('skip names rather than overlap on very tight rows', async () => {
    const data = Array.from({ length: 24 }, (_, i) => [
      {
        show: `Lampshade Disco night ${i + 1}`,
        phase: 'Presale',
        sold: 50 + i
      },
      { show: `Lampshade Disco night ${i + 1}`, phase: 'General', sold: 80 }
    ]).flat()
    const { container } = await settle(
      <StackedBars data={data} x='show' y='sold' series='phase' />,
      390
    )
    const count = container.querySelectorAll(LABELS).length
    expect(count).toBeGreaterThan(1)
    expect(count).toBeLessThan(24)
    expectNoOverlap(container, LABELS)
  })
})
