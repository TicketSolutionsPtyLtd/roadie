import { cleanup, render } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'

import { Logos } from '.'
import roadieCss from '../../vitest.browser.css?inline'
import {
  atWidth,
  axeViolations,
  useStylesheet,
  widths
} from '../_shared/testUtils'
import { partnerTiers } from './testUtils'

let removeStylesheet = () => {}
beforeAll(() => {
  removeStylesheet = useStylesheet(roadieCss)
})
afterEach(() => cleanup())
afterAll(async () => {
  removeStylesheet()
  await page.viewport(1920, 1080)
})

const tiles = () =>
  [...document.querySelectorAll('li')].map((tile) =>
    tile.getBoundingClientRect()
  )

const columns = () =>
  getComputedStyle(document.querySelector('ul')!)
    .gridTemplateColumns.split(' ')
    .filter((track) => parseFloat(track) > 0).length

describe('Logos partner-tiers layout', () => {
  it.each([
    { ...widths[0], columns: 2 },
    { ...widths[1], columns: 4 }
  ])(
    'fits $columns columns at $name width',
    async ({ width, height, columns: expected }) => {
      await atWidth(width, height)
      render(<Logos {...partnerTiers} />)

      const [featured, square] = tiles()
      expect(columns()).toBe(expected)
      expect(featured!.width).toBeGreaterThan(square!.width * 2)
      expect(featured!.height).toBeCloseTo(square!.height, 0)
      expect(square!.height).toBeCloseTo(square!.width, 0)
    }
  )

  it('packs a square partner into the gap a wide tile leaves', async () => {
    await atWidth(1280, 800)
    render(
      <Logos
        {...partnerTiers}
        partners={[
          ...partnerTiers.partners.slice(0, 2),
          { ...partnerTiers.partners[0]!, name: 'Wide' },
          { ...partnerTiers.partners[1]!, name: 'Last' }
        ]}
        also={undefined}
      />
    )

    const [first, , wide, last] = tiles()
    expect(Math.round(last!.top)).toBe(Math.round(first!.top))
    expect(wide!.top).toBeGreaterThan(first!.bottom)
  })
})

describe('Logos accessibility', () => {
  it.each(widths)(
    'partner-tiers has no axe violations at $name width',
    async ({ width, height }) => {
      await atWidth(width, height)
      const { container } = render(
        <main>
          <Logos {...partnerTiers} />
        </main>
      )

      expect(await axeViolations(container)).toEqual([])
    }
  )
})
