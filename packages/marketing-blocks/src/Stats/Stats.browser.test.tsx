import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Stats, type StatsEmphasis, type StatsProps } from '.'
import type { BlockIntent } from '../_shared/surface'
import {
  DESKTOP,
  PHONE,
  atWidth,
  axeViolations,
  withBrowserPage
} from '../_test/browser'
import { MINIMUM_LC, MODES, setMode, textContrast } from '../_test/contrast'

withBrowserPage()

const facts: StatsProps = {
  title: 'By the numbers',
  description: 'The impact of genuine partnerships',
  items: [
    { value: '33,000,000+', label: 'tickets sold', illustration: 'Ticket' },
    { value: '22,000+', label: 'event organisers', illustration: 'MapPin' },
    { value: '20+', label: 'years in ticketing', illustration: 'Heart' },
    { value: '50+', label: 'full-time team', illustration: 'HighFive' }
  ]
}

async function statsPerRowAt({
  width,
  height
}: {
  width: number
  height: number
}) {
  await atWidth(width, height)
  render(<Stats {...facts} />)
  const tops = screen
    .getAllByRole('listitem')
    .map((item) => Math.round(item.getBoundingClientRect().top))
  return tops.filter((top) => top === tops[0]).length
}

describe('Stats layout', () => {
  it('stacks the stats one to a row on phones', async () => {
    expect(await statsPerRowAt(PHONE)).toBe(1)
  })

  it('sets the stats two to a row at 640px, each inside its column', async () => {
    expect(await statsPerRowAt({ width: 640, height: 800 })).toBe(2)
    for (const item of screen.getAllByRole('listitem'))
      expect(item.scrollWidth).toBeLessThanOrEqual(item.clientWidth)
  })

  it('keeps a long figure inside its column at 640px', async () => {
    await atWidth(640, 800)
    render(
      <Stats
        title='By the numbers'
        items={[
          {
            value: '1,000,000,000,000+',
            label: 'tickets scanned',
            illustration: 'Ticket'
          },
          { value: '22,000+', label: 'event organisers' }
        ]}
      />
    )

    for (const item of screen.getAllByRole('listitem'))
      expect(item.scrollWidth).toBeLessThanOrEqual(item.clientWidth)
  })

  it('keeps a long word in the heading inside the block on phones', async () => {
    await atWidth(PHONE.width, PHONE.height)
    const { container } = render(
      <Stats {...facts} title={'Ticketing'.repeat(8)} />
    )

    const section = container.querySelector('section')!
    expect(section.scrollWidth).toBeLessThanOrEqual(section.clientWidth)
  })

  it('sets the stats four to a row on wide screens', async () => {
    expect(await statsPerRowAt(DESKTOP)).toBe(4)
  })

  it('sets a value written as words a step smaller than a figure, within two lines', async () => {
    await atWidth(DESKTOP.width, DESKTOP.height)
    render(
      <Stats
        title='By the numbers'
        items={[
          { value: '33,000,000+', label: 'tickets sold' },
          { value: '7 million+', label: 'fans each year' },
          {
            value: 'Service company of the year 2025',
            label: 'Australian Event Awards',
            illustration: 'Heart'
          }
        ]}
      />
    )

    const size = (text: string) =>
      parseFloat(getComputedStyle(screen.getByText(text)).fontSize)
    expect(size('7 million+')).toBe(size('33,000,000+'))
    expect(size('Service company of the year 2025')).toBeLessThan(
      size('33,000,000+')
    )
    const words = screen.getByText('Service company of the year 2025')
    const lineHeight = parseFloat(getComputedStyle(words).lineHeight)
    expect(words.getBoundingClientRect().height).toBeLessThan(lineHeight * 2.5)
  })

  it('sets each illustration beside its value', () => {
    const { container } = render(<Stats {...facts} />)

    const illustration = container
      .querySelector('li svg')!
      .getBoundingClientRect()
    const value = screen.getByText('33,000,000+').getBoundingClientRect()
    expect(illustration.right).toBeLessThanOrEqual(value.left)
    expect(illustration.top).toBeLessThan(value.bottom)
  })
})

describe('Stats accessibility', () => {
  it('has no axe violations as figures', async () => {
    const { container } = render(<Stats {...facts} />)

    expect(await axeViolations(container)).toEqual([])
  })
})

const EMPHASES: (StatsEmphasis | undefined)[] = [
  undefined,
  'raised',
  'subtle',
  'subtler'
]
const INTENTS: (BlockIntent | undefined)[] = [
  undefined,
  'neutral',
  'brand',
  'brand-secondary',
  'brand-purple',
  'accent',
  'info',
  'success',
  'warning',
  'danger'
]

describe('Stats contrast on every band', () => {
  it.each(
    MODES.flatMap((mode) =>
      EMPHASES.map((emphasis) => ({
        mode,
        emphasis,
        band: emphasis ?? 'no band'
      }))
    )
  )(
    'keeps the figures readable on $band in $mode mode, for every intent',
    async ({ mode, emphasis }) => {
      await atWidth(DESKTOP.width, DESKTOP.height)
      setMode(mode)
      try {
        for (const intent of INTENTS) {
          const { unmount } = render(
            <Stats {...facts} intent={intent} emphasis={emphasis} />
          )
          const at = `${intent ?? 'no'} intent`
          for (const element of [
            screen.getByRole('heading', { level: 2 }),
            screen.getByText('33,000,000+')
          ])
            expect(textContrast(element), at).toBeGreaterThanOrEqual(
              MINIMUM_LC.large
            )
          for (const element of [
            screen.getByText('The impact of genuine partnerships'),
            screen.getByText('tickets sold')
          ])
            expect(textContrast(element), at).toBeGreaterThanOrEqual(
              MINIMUM_LC.body
            )
          unmount()
        }
      } finally {
        setMode('light')
      }
    }
  )

  it("sets the figures in the intent's strong text colour", async () => {
    await atWidth(DESKTOP.width, DESKTOP.height)
    const { unmount } = render(<Stats {...facts} />)
    const neutral = getComputedStyle(screen.getByText('33,000,000+')).color
    unmount()

    render(<Stats {...facts} intent='brand' />)

    expect(getComputedStyle(screen.getByText('33,000,000+')).color).not.toBe(
      neutral
    )
  })

  it.each(EMPHASES.slice(1))(
    'has no axe violations on %s',
    async (emphasis) => {
      const { container } = render(
        <Stats {...facts} intent='brand' emphasis={emphasis} />
      )

      expect(await axeViolations(container)).toEqual([])
    }
  )
})
