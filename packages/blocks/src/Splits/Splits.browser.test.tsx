import type { ComponentType } from 'react'

import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Splits, type SplitsProps } from '.'
import type { BlockEmphasis, BlockIntent } from '../_shared/surface'
import {
  DESKTOP,
  atWidth,
  axeViolations,
  photo,
  withBrowserPage
} from '../_test/browser'
import { MINIMUM_LC, MODES, setMode, textContrast } from '../_test/contrast'
import { describeBlockFrame } from '../_test/frame'

withBrowserPage()

const LOOK = {
  preset: 'marked',
  title: 'Our values',
  description: 'Five principles shape how we partner with you.',
  actions: [{ label: 'Meet the team', href: '/about/team' }],
  items: ['Proactive touch', 'Positive energy', 'Integrity'].map(
    (title, index) => ({
      title,
      subtitle: 'See it coming, solve it early',
      description: 'We spot issues before they become problems.',
      image: photo(`${title} photo ${index + 1}`, 400, 300)
    })
  )
} satisfies SplitsProps

describeBlockFrame('splits', 'marked', Splits as ComponentType<never>, {
  items: LOOK.items
})

async function renderAt(
  { width, height }: { width: number; height: number },
  props: SplitsProps
) {
  await atWidth(width, height)
  return render(<Splits {...props} />)
}

const box = (element: Element) => element.getBoundingClientRect()

describe('Splits rows', () => {
  const rows = () => screen.getAllByRole('listitem')
  const sides = () =>
    rows().map((row) => {
      const text = within(row).getByRole('heading').getBoundingClientRect()
      const image = within(row).getByRole('img').getBoundingClientRect()
      if (image.top >= text.bottom) return 'below'
      return image.left > text.left ? 'right' : 'left'
    })
  const at = (width: number, props: Partial<SplitsProps> = {}) =>
    render(
      <div style={{ width }}>
        <Splits {...LOOK} {...props} />
      </div>
    )

  it('sets each image below its text on a phone', () => {
    at(375)

    expect(sides()).toEqual(['below', 'below', 'below'])
  })

  it.each([640, 1280])(
    'alternates the image’s side at %ipx, starting on the left',
    (width) => {
      at(width)

      expect(sides()).toEqual(['left', 'right', 'left'])
    }
  )

  it('crops a sized 4:3 photo square', () => {
    at(1280)

    const { width, height } = box(within(rows()[0]!).getByRole('img'))
    expect(width / height).toBeCloseTo(1, 2)
  })

  it('runs its description the full width of the block', () => {
    at(1280, {
      description:
        'We live our values in every event setup, every support call, and every challenge we solve together. '.repeat(
          3
        )
    })

    const list = box(rows()[0]!.parentElement!)
    expect(box(screen.getByText(/We live our values/)).width).toBeGreaterThan(
      list.width - 2
    )
  })

  it('leaves the space above it to the page', () => {
    at(1280)

    expect(
      Math.round(
        box(screen.getByRole('heading', { level: 2 })).top -
          box(screen.getByRole('region')).top
      )
    ).toBe(0)
  })

  it('makes a linked row one hit area', () => {
    at(1280, {
      items: [{ ...LOOK.items[0]!, href: '#proactive' }]
    })

    const link = screen.getByRole('link', { name: 'Proactive touch' })
    const { left, top, right, bottom } = box(rows()[0]!)
    for (const [x, y] of [
      [left + 12, top + 12],
      [right - 12, bottom - 12],
      [(left + right) / 2, (top + bottom) / 2]
    ] as const)
      expect(link.contains(document.elementFromPoint(x, y))).toBe(true)
  })
})

describe('Splits at a mid width', () => {
  it('keeps a long unbroken word inside the block at 640px', async () => {
    const { container } = await renderAt(
      { width: 640, height: 800 },
      { ...LOOK, description: 'ticketing'.repeat(20) }
    )

    const section = container.querySelector('section')!
    expect(section.scrollWidth).toBeLessThanOrEqual(section.clientWidth)
  })
})

describe('Splits accessibility', () => {
  it('has no axe violations', async () => {
    const { container } = await renderAt(DESKTOP, LOOK)

    expect(await axeViolations(container)).toEqual([])
  })
})

const EMPHASES: BlockEmphasis[] = ['subtle', 'subtler', 'normal', 'raised']
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

describe('Splits contrast on every surface', () => {
  it.each(
    MODES.flatMap((mode) => EMPHASES.map((emphasis) => ({ mode, emphasis })))
  )(
    'keeps its text readable on $emphasis in $mode mode, for every intent',
    async ({ mode, emphasis }) => {
      setMode(mode)
      try {
        for (const intent of INTENTS) {
          const { container, unmount } = await renderAt(DESKTOP, {
            ...LOOK,
            intent,
            emphasis
          })
          const at = `${intent ?? 'default'} intent`
          for (const element of container.querySelectorAll('h2, h3'))
            expect(textContrast(element), at).toBeGreaterThanOrEqual(
              MINIMUM_LC.large
            )
          for (const element of container.querySelectorAll('li p'))
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
})
