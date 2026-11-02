import type { ComponentType } from 'react'

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Stats, type StatsProps } from '.'
import type { BlockEmphasis, BlockIntent } from '../_shared/surface'
import {
  DESKTOP,
  PHONE,
  atWidth,
  axeViolations,
  centreOf,
  fontSizeOf,
  textAlignOf,
  withBrowserPage
} from '../_test/browser'
import { MINIMUM_LC, MODES, setMode, textContrast } from '../_test/contrast'
import { describeBlockFrame } from '../_test/frame'

withBrowserPage()

describeBlockFrame('stats', 'figures', Stats as ComponentType<never>, {
  stats: [{ value: '7 million+', label: 'tickets sold' }]
})

const facts: StatsProps = {
  title: 'By the numbers',
  description: 'The impact of genuine partnerships',
  stats: [
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
        stats={[
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

  const fans = {
    value: '7 million+',
    label: 'fans each year',
    illustration: 'FlowerSpiral'
  } as const
  const rows = () => {
    const tops = screen
      .getAllByRole('listitem')
      .map((item) => Math.round(item.getBoundingClientRect().top))
    return [...new Set(tops)].map(
      (top) => tops.filter((other) => other === top).length
    )
  }

  it.each([
    [5, [3, 2]],
    [6, [3, 3]]
  ])(
    'balances %i stats into rows of %j on wide screens, never leaving one alone',
    async (count, expected) => {
      await atWidth(DESKTOP.width, DESKTOP.height)
      render(
        <Stats
          {...facts}
          stats={[...facts.stats, fans, fans].slice(0, count)}
        />
      )

      expect(rows()).toEqual(expected)
    }
  )

  it.each(
    [390, 640, 900, 1150, 1280].flatMap((width) =>
      [4, 5].map((count) => [count, width] as const)
    )
  )(
    'keeps a figure and the sign after it on one line, with %i stats at %ipx',
    async (count, width) => {
      await atWidth(width, 900)
      render(
        <Stats {...facts} stats={[...facts.stats, fans].slice(0, count)} />
      )

      const figure = screen.getByText('33,000,000+')
      const lineHeight = parseFloat(getComputedStyle(figure).lineHeight)
      expect(figure.getBoundingClientRect().height).toBeLessThan(
        lineHeight * 1.5
      )
      for (const item of screen.getAllByRole('listitem'))
        expect(item.scrollWidth).toBeLessThanOrEqual(item.clientWidth)
    }
  )

  it.each([640, 900, 1000, 1150, 1280])(
    'sets every stat in a row alike, illustration beside or above, at %ipx',
    async (width) => {
      await atWidth(width, 900)
      render(
        <Stats
          title='Results from last season'
          stats={[
            {
              value: '98%',
              // Long enough to outgrow the room beside its illustration in any font.
              label: 'tickets scanned on time at every gate across the venue',
              illustration: 'HighFive'
            },
            {
              value: '12 minutes',
              label: 'average wait to get in',
              illustration: 'FlowerSpiral'
            },
            {
              value: '4.9 out of 5',
              label: 'support rating',
              illustration: 'Heart'
            }
          ]}
        />
      )

      const beside = screen.getAllByRole('listitem').map((item) => {
        const art = item.querySelector('svg')!.getBoundingClientRect()
        const value = item.querySelector('p')!.getBoundingClientRect()
        return value.left >= art.right
      })
      expect(new Set(beside).size).toBe(1)
    }
  )

  it('sets the stats four to a row on wide screens', async () => {
    expect(await statsPerRowAt(DESKTOP)).toBe(4)
  })

  it('sets a value written as words a step smaller than a figure, within two lines', async () => {
    await atWidth(DESKTOP.width, DESKTOP.height)
    render(
      <Stats
        title='By the numbers'
        stats={[
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

    // Each word of a value is its own span, so match the value's paragraph whole.
    const value = (text: string) =>
      screen.getByText(
        (_, element) => element?.tagName === 'P' && element.textContent === text
      )
    const size = (text: string) =>
      parseFloat(getComputedStyle(value(text)).fontSize)
    expect(size('7 million+')).toBe(size('33,000,000+'))
    expect(size('Service company of the year 2025')).toBeLessThan(
      size('33,000,000+')
    )
    const words = value('Service company of the year 2025')
    const lineHeight = parseFloat(getComputedStyle(words).lineHeight)
    expect(words.getBoundingClientRect().height).toBeLessThan(lineHeight * 2.5)
  })

  it('sets each illustration beside its value in a column with room', async () => {
    await atWidth(PHONE.width, PHONE.height)
    const { container } = render(<Stats {...facts} />)

    const illustration = container
      .querySelector('li svg')!
      .getBoundingClientRect()
    const value = screen.getByText('33,000,000+').getBoundingClientRect()
    expect(illustration.right).toBeLessThanOrEqual(value.left)
    expect(illustration.top).toBeLessThan(value.bottom)
  })

  it('sets each illustration above its value in a narrow column', async () => {
    await atWidth(900, 900)
    const { container } = render(<Stats {...facts} />)

    const illustration = container
      .querySelector('li svg')!
      .getBoundingClientRect()
    const value = screen.getByText('33,000,000+').getBoundingClientRect()
    expect(illustration.bottom).toBeLessThanOrEqual(value.top)
  })
})

describe('Stats accessibility', () => {
  it('has no axe violations as figures', async () => {
    const { container } = render(<Stats {...facts} />)

    expect(await axeViolations(container)).toEqual([])
  })
})

const EMPHASES: (BlockEmphasis | undefined)[] = [
  undefined,
  'raised',
  'normal',
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

  it.each(
    EMPHASES.slice(1).flatMap((emphasis) =>
      [true, false].map((contained) => [emphasis, contained] as const)
    )
  )(
    'has no axe violations on %s, contained %s',
    async (emphasis, contained) => {
      const { container } = render(
        <Stats
          {...facts}
          intent='brand'
          emphasis={emphasis}
          contained={contained}
        />
      )

      expect(await axeViolations(container)).toEqual([])
    }
  )
})

describe('Stats align and size', () => {
  const heading = () => screen.getByRole('heading', { level: 2 })

  it('starts the heading by default, and centres it when asked', () => {
    const { rerender } = render(<Stats {...facts} />)
    expect(textAlignOf(heading())).toBe('start')

    rerender(<Stats {...facts} align='center' />)
    expect(textAlignOf(heading())).toBe('center')
  })

  it('sets the title smaller at md, and again at sm', async () => {
    await atWidth(DESKTOP.width, DESKTOP.height)
    const { rerender } = render(<Stats {...facts} />)
    const large = fontSizeOf(heading())

    rerender(<Stats {...facts} size='md' />)
    expect(fontSizeOf(heading())).toBeLessThan(large)
    const medium = fontSizeOf(heading())

    rerender(<Stats {...facts} size='sm' />)
    expect(fontSizeOf(heading())).toBeLessThan(medium)
  })

  it('lines its action up with a centred heading', async () => {
    await atWidth(DESKTOP.width, DESKTOP.height)
    render(
      <Stats
        {...facts}
        align='center'
        actions={[{ label: 'Talk to us', href: '/contact/sales' }]}
      />
    )

    const link = screen.getByRole('link', { name: 'Talk to us' })
    expect(
      Math.abs(centreOf(link) - centreOf(heading().parentElement!))
    ).toBeLessThan(2)
  })
})

describe('Stats panel', () => {
  it('pads the figures inside a rounded panel within the page padding', async () => {
    await atWidth(DESKTOP.width, DESKTOP.height)
    const { container } = render(<Stats {...facts} emphasis='subtle' />)
    const section = container.querySelector('section')!.getBoundingClientRect()
    const panel = container.querySelector('[data-slot=block-surface]')!
    const heading = screen.getByRole('heading', { level: 2 })

    expect(panel.getBoundingClientRect().left).toBeGreaterThan(section.left)
    expect(getComputedStyle(panel).borderTopLeftRadius).not.toBe('0px')
    expect(heading.getBoundingClientRect().left).toBeGreaterThan(
      panel.getBoundingClientRect().left
    )
  })

  it('keeps the heading where it was on no surface, flush with the block', async () => {
    await atWidth(DESKTOP.width, DESKTOP.height)
    const { container } = render(<Stats {...facts} />)

    expect(
      screen.getByRole('heading', { level: 2 }).getBoundingClientRect().top
    ).toBe(container.querySelector('section')!.getBoundingClientRect().top)
  })
})
