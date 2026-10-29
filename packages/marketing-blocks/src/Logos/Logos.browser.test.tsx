import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Logos, type LogosProps } from '.'
import {
  DESKTOP,
  atWidth,
  axeViolations,
  photo,
  widths,
  withBrowserPage
} from '../_test/browser'
import { partnerTiers } from './fixtures'

withBrowserPage()

const offline = (props: LogosProps): LogosProps => ({
  ...props,
  partners: props.partners.map((partner) => ({
    ...partner,
    image: photo(''),
    logo: photo(partner.logo.alt, 240, 80)
  })),
  also: props.also && {
    ...props.also,
    logos: props.also.logos.map((logo) => photo(logo.alt, 240, 80))
  }
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
      render(<Logos {...offline(partnerTiers)} />)

      const [featured, square] = tiles()
      expect(columns()).toBe(expected)
      expect(featured!.width).toBeGreaterThan(square!.width * 2)
      expect(featured!.height).toBeCloseTo(square!.height, 0)
      expect(square!.height).toBeCloseTo(square!.width, 0)
    }
  )

  it('packs a square partner into the gap a wide tile leaves', async () => {
    await atWidth(DESKTOP.width, DESKTOP.height)
    const [featured, square] = offline(partnerTiers).partners
    render(
      <Logos
        {...partnerTiers}
        partners={[featured!, square!, featured!, square!]}
        also={undefined}
      />
    )

    const [first, , wide, last] = tiles()
    expect(Math.round(last!.top)).toBe(Math.round(first!.top))
    expect(wide!.top).toBeGreaterThan(first!.bottom)
  })
})

describe('Logos photos', () => {
  it('fills each tile with its photo whatever shape the photo is', async () => {
    await atWidth(DESKTOP.width, DESKTOP.height)
    const [featured, square] = offline(partnerTiers).partners
    render(
      <Logos
        {...partnerTiers}
        partners={[
          { ...featured!, image: photo('', 400, 1200) },
          { ...square!, image: photo('', 1200, 400) }
        ]}
        also={undefined}
      />
    )

    for (const tile of document.querySelectorAll('li')) {
      const frame = tile.getBoundingClientRect()
      const image = tile.querySelector('img')!.getBoundingClientRect()
      expect(image.width).toBeCloseTo(frame.width, 0)
      expect(image.height).toBeCloseTo(frame.height, 0)
    }
  })
})

describe('Logos accessibility', () => {
  it.each(widths)(
    'partner-tiers has no axe violations at $name width',
    async ({ width, height }) => {
      await atWidth(width, height)
      const { container } = render(
        <main>
          <Logos {...offline(partnerTiers)} />
        </main>
      )

      expect(await axeViolations(container)).toEqual([])
    }
  )
})
