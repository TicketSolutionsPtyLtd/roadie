import type { ComponentType } from 'react'

import { cleanup, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Split, type SplitProps } from '.'
import type { BlockEmphasis, BlockIntent } from '../_shared/surface'
import {
  DESKTOP,
  PHONE,
  atWidth,
  axeViolations,
  centreOf,
  fontSizeOf,
  photo,
  textAlignOf,
  withBrowserPage
} from '../_test/browser'
import { MINIMUM_LC, MODES, setMode, textContrast } from '../_test/contrast'
import { describeBlockFrame } from '../_test/frame'

withBrowserPage()

describeBlockFrame('split', 'media-text', Split as ComponentType<never>, {
  image: photo('A crowd')
})

// The old presets, each as the props that reproduce it.
const LOOKS = {
  'tinted-panel': {
    preset: 'media-text',
    size: 'md',
    emphasis: 'subtle',
    intent: 'info',
    contained: true,
    title: 'Specialist teams powering venues and event organisers',
    description:
      'Teams in innovation, operations, marketing, events, and finance.',
    image: photo('Two team members working together at a desk', 1280, 1007)
  },
  'media-text': {
    preset: 'media-text',
    title: 'Get your gig on Spotify',
    body: <p>Your events show on artist profiles where fans already listen.</p>,
    actions: [{ label: 'Set it up', href: '/spotify' }],
    image: photo('An event listing on an artist profile', 1200, 1000)
  },
  'text-and-stats': {
    preset: 'media-text',
    title: 'Who we are',
    body: (
      <>
        <h3>Australian owned and operated</h3>
        <p>
          Our platform is hosted in Australia, and built and improved in-house
          by a full-time team, with casual staff at events nationwide.
        </p>
      </>
    ),
    actions: [{ label: 'Meet the team', href: '/about/team' }],
    stats: {
      title: 'By the numbers',
      description: 'The impact of genuine partnerships',
      items: [
        { value: '33,000,000+', label: 'tickets sold', illustration: 'Ticket' },
        { value: '22,000+', label: 'event organisers', illustration: 'MapPin' },
        { value: '50+', label: 'full-time team', illustration: 'HighFive' }
      ]
    }
  },
  'alternating-rows': {
    preset: 'alternating-rows',
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
  }
} satisfies Record<string, SplitProps>

async function renderAt(
  { width, height }: { width: number; height: number },
  props: SplitProps
) {
  await atWidth(width, height)
  return render(<Split {...props} />)
}

const box = (element: Element) => element.getBoundingClientRect()
const isBeside = (first: Element, second: Element) =>
  box(first).right <= box(second).left
const isAbove = (first: Element, second: Element) =>
  box(first).bottom <= box(second).top

describe('Split align and size', () => {
  const heading = () => screen.getByRole('heading', { level: 2 })

  it('sets the title smaller at md, and again at sm', async () => {
    await renderAt(DESKTOP, LOOKS['media-text'])
    const large = fontSizeOf(heading())

    cleanup()
    await renderAt(DESKTOP, { ...LOOKS['media-text'], size: 'md' })
    expect(fontSizeOf(heading())).toBeLessThan(large)
    const medium = fontSizeOf(heading())

    cleanup()
    await renderAt(DESKTOP, { ...LOOKS['media-text'], size: 'sm' })
    expect(fontSizeOf(heading())).toBeLessThan(medium)
  })

  it('sets the body of a stats split smaller at md', async () => {
    const body = () => screen.getByText(/hosted in Australia/)
    await renderAt(DESKTOP, LOOKS['text-and-stats'])
    const large = fontSizeOf(body())

    cleanup()
    await renderAt(DESKTOP, { ...LOOKS['text-and-stats'], size: 'md' })
    expect(fontSizeOf(body())).toBeLessThan(large)
  })

  it('centres the heading and actions when align is center', async () => {
    await renderAt(DESKTOP, { ...LOOKS['media-text'], align: 'center' })

    expect(textAlignOf(heading())).toBe('center')
    const link = screen.getByRole('link', { name: 'Set it up' })
    expect(
      Math.abs(centreOf(link) - centreOf(heading().parentElement!))
    ).toBeLessThan(2)
  })
})

describe('Split layout', () => {
  it('sets the tinted-panel image beside the text on wide screens, and above it on phones', async () => {
    await renderAt(DESKTOP, LOOKS['tinted-panel'])
    const image = () => screen.getByRole('img', { name: /team members/ })
    const heading = () => screen.getByRole('heading', { level: 2 })
    expect(isBeside(image(), heading())).toBe(true)

    cleanup()
    await renderAt(PHONE, LOOKS['tinted-panel'])
    expect(isAbove(image(), heading())).toBe(true)
  })

  it('sets the media-text image beside the text in equal halves on wide screens, and above it on phones', async () => {
    await renderAt(DESKTOP, LOOKS['media-text'])
    const image = () => screen.getByRole('img', { name: /event listing/ })
    const heading = () => screen.getByRole('heading', { level: 2 })
    expect(isBeside(image(), heading())).toBe(true)
    expect(box(image()).width).toBeCloseTo(
      box(heading().parentElement!).width,
      -1
    )

    cleanup()
    await renderAt(PHONE, LOOKS['media-text'])
    expect(isAbove(image(), heading())).toBe(true)
  })

  it('crops a sized media-text photo to 4 by 3', async () => {
    await renderAt(DESKTOP, LOOKS['media-text'])

    const { width, height } = box(
      screen.getByRole('img', { name: /event listing/ })
    )
    expect(width / height).toBeCloseTo(4 / 3, 1)
  })

  it('sets the text-and-stats aside beside the text on wide screens, and wraps it below on phones', async () => {
    await renderAt(DESKTOP, LOOKS['text-and-stats'])
    const body = () => screen.getByText(/hosted in Australia/)
    const aside = () => screen.getByRole('heading', { name: 'By the numbers' })
    expect(isBeside(body(), aside())).toBe(true)

    cleanup()
    await renderAt(PHONE, LOOKS['text-and-stats'])
    expect(isAbove(body(), aside())).toBe(true)
  })

  it('crops a sized tinted-panel photo to 8 by 5', async () => {
    await renderAt(DESKTOP, LOOKS['tinted-panel'])

    const { width, height } = box(
      screen.getByRole('img', { name: /team members/ })
    )
    expect(width / height).toBeCloseTo(8 / 5, 1)
  })

  it('gives a tinted-panel with no image the whole panel for its text', async () => {
    const { container } = await renderAt(DESKTOP, {
      ...LOOKS['tinted-panel'],
      image: undefined
    })

    const section = box(container.querySelector('section')!)
    const heading = screen.getByRole('heading', { level: 2 }).parentElement!
    expect(box(heading).width).toBeGreaterThan(section.width * 0.8)
  })
})

const MID = { width: 640, height: 800 }

describe('Split at a mid width', () => {
  it.each([
    ['tinted-panel', /team members/],
    ['media-text', /event listing/]
  ] as const)(
    'sets the %s media beside the text at 640px',
    async (look, name) => {
      await renderAt(MID, LOOKS[look])

      expect(
        isBeside(
          screen.getByRole('img', { name }),
          screen.getByRole('heading', { level: 2 })
        )
      ).toBe(true)
    }
  )

  it('keeps the text-and-stats aside below the text at 640px, where a stat would not fit beside it', async () => {
    await renderAt(MID, LOOKS['text-and-stats'])

    expect(
      isAbove(
        screen.getByText(/hosted in Australia/),
        screen.getByRole('heading', { name: 'By the numbers' })
      )
    ).toBe(true)
  })

  it.each(Object.values(LOOKS))(
    'keeps a long unbroken word inside the block as $preset at 640px',
    async (props) => {
      const { container } = await renderAt(MID, {
        ...props,
        body: <p>{'ticketing'.repeat(20)}</p>
      })

      const section = container.querySelector('section')!
      expect(section.scrollWidth).toBeLessThanOrEqual(section.clientWidth)
    }
  )
})

const WIDE = { width: 1440, height: 900 }

describe('Split at 1440px, as on the live site', () => {
  it('gives text-and-stats a growing text column and a stats aside of about 20rem at the end', async () => {
    const { container } = await renderAt(WIDE, LOOKS['text-and-stats'])

    const section = box(container.querySelector('section')!)
    const aside = box(
      screen.getByRole('heading', { name: 'By the numbers' }).parentElement!
        .parentElement!
    )
    expect(aside.width).toBeCloseTo(320, -1)
    expect(aside.left).toBeGreaterThan(section.left + section.width * 0.7)
  })
})

describe('Split tinted panel', () => {
  it('sets the description and body in neutral subtle text on the tinted panel', async () => {
    await atWidth(DESKTOP.width, DESKTOP.height)
    render(
      <>
        <p className='text-subtle'>Neutral reference</p>
        <Split
          {...LOOKS['tinted-panel']}
          body={<p>Body copy on the panel.</p>}
        />
      </>
    )

    const neutral = getComputedStyle(
      screen.getByText('Neutral reference')
    ).color
    expect(
      getComputedStyle(screen.getByText(LOOKS['tinted-panel'].description))
        .color
    ).toBe(neutral)
    expect(
      getComputedStyle(screen.getByText('Body copy on the panel.')).color
    ).toBe(neutral)
  })
})

describe('Split alternating rows', () => {
  const rows = () => screen.getAllByRole('listitem')
  const sides = () =>
    rows().map((row) => {
      const text = within(row).getByRole('heading').getBoundingClientRect()
      const image = within(row).getByRole('img').getBoundingClientRect()
      if (image.top >= text.bottom) return 'below'
      return image.left > text.left ? 'right' : 'left'
    })
  const at = (width: number, props: Partial<SplitProps> = {}) =>
    render(
      <div style={{ width }}>
        <Split {...LOOKS['alternating-rows']} {...props} />
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
      items: [{ ...LOOKS['alternating-rows'].items[0]!, href: '#proactive' }]
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

describe('Split accessibility', () => {
  it.each(Object.entries(LOOKS))(
    'has no axe violations as %s',
    async (_look, props) => {
      const { container } = await renderAt(DESKTOP, props)

      expect(await axeViolations(container)).toEqual([])
    }
  )
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

describe('Split contrast on every panel', () => {
  it.each(
    MODES.flatMap((mode) =>
      EMPHASES.flatMap((emphasis) =>
        (['tinted-panel', 'text-and-stats'] as const).map((look) => ({
          mode,
          emphasis,
          look
        }))
      )
    )
  )(
    'keeps $look text readable on $emphasis in $mode mode, for every intent',
    async ({ mode, emphasis, look }) => {
      setMode(mode)
      try {
        for (const intent of INTENTS) {
          const { container, unmount } = await renderAt(DESKTOP, {
            ...LOOKS[look],
            description: 'A sentence under the title.',
            body: <p>Body text on the panel.</p>,
            intent,
            emphasis
          })
          const at = `${intent ?? 'default'} intent`
          const large = [
            screen.getByRole('heading', { level: 2 }),
            ...container.querySelectorAll('h3, li p:first-child')
          ]
          const body = [
            screen.getByText('A sentence under the title.'),
            screen.getByText('Body text on the panel.'),
            ...container.querySelectorAll('li p:last-child')
          ]
          for (const element of large)
            expect(textContrast(element), at).toBeGreaterThanOrEqual(
              MINIMUM_LC.large
            )
          for (const element of body)
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

  it.each(
    MODES.flatMap((mode) => EMPHASES.map((emphasis) => ({ mode, emphasis })))
  )(
    'keeps alternating-rows text readable on $emphasis in $mode mode, for every intent',
    async ({ mode, emphasis }) => {
      setMode(mode)
      try {
        for (const intent of INTENTS) {
          const { container, unmount } = await renderAt(DESKTOP, {
            ...LOOKS['alternating-rows'],
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

  it.each(EMPHASES)('has no axe violations on %s', async (emphasis) => {
    const { container } = await renderAt(DESKTOP, {
      ...LOOKS['media-text'],
      intent: 'brand',
      emphasis
    })

    expect(await axeViolations(container)).toEqual([])
  })
})
