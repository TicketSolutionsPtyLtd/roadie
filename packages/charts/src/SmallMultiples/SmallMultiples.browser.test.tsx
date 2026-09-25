import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import { SmallMultiples } from '.'
import roadieCss from '../../vitest.browser.css?inline'
import {
  afterResize,
  expectMinFontSize,
  expectTableKeepsHeight,
  renderInCard
} from '../plot/browserTesting'
import { loadBrandFont, useStylesheet } from '../testUtils'
import { gatesExample } from './examples'

let removeStylesheet = () => {}
beforeAll(async () => {
  removeStylesheet = useStylesheet(roadieCss)
  await loadBrandFont()
})
afterAll(() => removeStylesheet())
afterEach(() => cleanup())

describe('SmallMultiples in a card', () => {
  it.each([
    [1200, 4],
    [560, 2],
    [320, 1]
  ])('lays out panels by width at %ipx', (width, perRow) => {
    const { container } = renderInCard(<SmallMultiples {...gatesExample} />, {
      size: 'full',
      width
    })
    const tops = [...container.querySelectorAll('figure')].map((f) =>
      Math.round(f.getBoundingClientRect().top)
    )
    expect(tops.filter((t) => t === tops[0])).toHaveLength(perRow)
  })

  const yTicks = (container: HTMLElement) =>
    [...container.querySelectorAll('figure')].map((f) =>
      [...f.querySelectorAll('text[data-ts-key^="y-tick-label"]')]
        .map((t) => t.textContent)
        .join()
    )

  it('draws every panel on the same scale', () => {
    const { container } = renderInCard(<SmallMultiples {...gatesExample} />, {
      size: 'full',
      width: 1200
    })
    const ticks = yTicks(container)
    expect(ticks).toHaveLength(4)
    expect(ticks[0]).toBe('0,150,300')
    expect(new Set(ticks).size).toBe(1)
  })

  it('scales each panel to itself when not shared', () => {
    const { container } = renderInCard(
      <SmallMultiples {...gatesExample} shared={false} />,
      { size: 'full', width: 1200 }
    )
    expect(new Set(yTicks(container)).size).toBe(4)
  })

  it('makes each panel a named tab stop', async () => {
    const { container } = renderInCard(<SmallMultiples {...gatesExample} />, {
      size: 'full',
      width: 1200
    })
    expect(
      [...container.querySelectorAll('svg.ts-chart')].map((s) =>
        s.getAttribute('tabindex')
      )
    ).toEqual(['0', '0', '0', '0'])
    expect(
      [...container.querySelectorAll('svg.ts-chart')].map(
        (s) => s.getAttribute('aria-label')?.split('.')[0]
      )
    ).toEqual(['North gate', 'South gate', 'River entry', 'Accessible entry'])
  })

  it('keeps text at 11px or more on a phone', async () => {
    const { container } = renderInCard(<SmallMultiples {...gatesExample} />, {
      size: 'full',
      width: 320
    })
    await afterResize()
    expectMinFontSize(container)
  })

  it('keeps the card height when switching to the table', async () => {
    const { container, getByRole } = renderInCard(
      <SmallMultiples {...gatesExample} />,
      { size: 'full' }
    )
    await expectTableKeepsHeight(container, getByRole)
  })
})
