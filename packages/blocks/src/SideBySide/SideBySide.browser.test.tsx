import type { ComponentType } from 'react'

import { cleanup, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { SideBySide, type SideBySideProps } from '.'
import type { BlockEmphasis, BlockIntent, BlockRatio } from '../_shared/surface'
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
import { sideBySideDefinition } from './definition'

withBrowserPage()

describeBlockFrame(
  'side-by-side',
  'image-start',
  SideBySide as ComponentType<never>,
  { image: photo('A crowd') }
)

// The old presets, each as the props that reproduce it.
const LOOKS = {
  'tinted-panel': {
    preset: 'image-start',
    size: 'md',
    emphasis: 'subtle',
    intent: 'info',
    contained: true,
    title: 'Specialist teams powering venues and event organisers',
    description:
      'Teams in innovation, operations, marketing, events, and finance.',
    image: photo('Two team members working together at a desk', 1280, 1007)
  },
  'image-start': {
    preset: 'image-start',
    title: 'Get your gig on Lyrebird Radio',
    body: <p>Your events show on artist profiles where fans already listen.</p>,
    actions: [{ label: 'Set it up', href: '/spotify' }],
    image: photo('An event listing on an artist profile', 1200, 1000)
  },
  'text-and-stats': {
    preset: 'stats',
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
      figures: [
        { value: '33,000,000+', label: 'tickets sold', illustration: 'Ticket' },
        { value: '22,000+', label: 'event organisers', illustration: 'MapPin' },
        { value: '50+', label: 'full-time team', illustration: 'HighFive' }
      ]
    }
  }
} satisfies Record<string, SideBySideProps>

async function renderAt(
  { width, height }: { width: number; height: number },
  props: SideBySideProps
) {
  await atWidth(width, height)
  return render(<SideBySide {...props} />)
}

const box = (element: Element) => element.getBoundingClientRect()
const isBeside = (first: Element, second: Element) =>
  box(first).right <= box(second).left
const isAbove = (first: Element, second: Element) =>
  box(first).bottom <= box(second).top

describe('SideBySide align and size', () => {
  const heading = () => screen.getByRole('heading', { level: 2 })

  it('sets the title smaller at md, and again at sm', async () => {
    await renderAt(DESKTOP, LOOKS['image-start'])
    const large = fontSizeOf(heading())

    cleanup()
    await renderAt(DESKTOP, { ...LOOKS['image-start'], size: 'md' })
    expect(fontSizeOf(heading())).toBeLessThan(large)
    const medium = fontSizeOf(heading())

    cleanup()
    await renderAt(DESKTOP, { ...LOOKS['image-start'], size: 'sm' })
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

  it.each(['image-start', 'image-end'] as const)(
    'sets the body of %s smaller at md than at lg',
    async (preset) => {
      const body = () => screen.getByText(/fans already listen/)
      await renderAt(DESKTOP, { ...LOOKS['image-start'], preset })
      const large = fontSizeOf(body())

      cleanup()
      await renderAt(DESKTOP, { ...LOOKS['image-start'], preset, size: 'md' })
      expect(fontSizeOf(body())).toBeLessThan(large)
    }
  )

  it.each(['image-start', 'image-end'] as const)(
    'sets the gaps of %s tighter at sm than at md',
    async (preset) => {
      const gaps = () => {
        const image = box(screen.getByRole('img', { name: /event listing/ }))
        const text = box(heading().parentElement!)
        const body = box(screen.getByText(/fans already listen/))
        return {
          beside: Math.max(image.left - text.right, text.left - image.right),
          below: body.top - text.bottom
        }
      }
      await renderAt(DESKTOP, { ...LOOKS['image-start'], preset, size: 'md' })
      const medium = gaps()

      cleanup()
      await renderAt(DESKTOP, { ...LOOKS['image-start'], preset, size: 'sm' })
      const small = gaps()
      expect(small.beside).toBeLessThan(medium.beside)
      expect(small.below).toBeLessThan(medium.below)
    }
  )

  it('centres the heading and actions when align is center', async () => {
    await renderAt(DESKTOP, { ...LOOKS['image-start'], align: 'center' })

    expect(textAlignOf(heading())).toBe('center')
    const link = screen.getByRole('link', { name: 'Set it up' })
    expect(
      Math.abs(centreOf(link) - centreOf(heading().parentElement!))
    ).toBeLessThan(2)
  })
})

describe('SideBySide layout', () => {
  it('sets the tinted-panel image beside the text on wide screens, and above it on phones', async () => {
    await renderAt(DESKTOP, LOOKS['tinted-panel'])
    const image = () => screen.getByRole('img', { name: /team members/ })
    const heading = () => screen.getByRole('heading', { level: 2 })
    expect(isBeside(image(), heading())).toBe(true)

    cleanup()
    await renderAt(PHONE, LOOKS['tinted-panel'])
    expect(isAbove(image(), heading())).toBe(true)
  })

  it('sets the image-start image beside the text in equal halves on wide screens, and above it on phones', async () => {
    await renderAt(DESKTOP, LOOKS['image-start'])
    const image = () => screen.getByRole('img', { name: /event listing/ })
    const heading = () => screen.getByRole('heading', { level: 2 })
    expect(isBeside(image(), heading())).toBe(true)
    expect(box(image()).width).toBeCloseTo(
      box(heading().parentElement!).width,
      -1
    )

    cleanup()
    await renderAt(PHONE, LOOKS['image-start'])
    expect(isAbove(image(), heading())).toBe(true)
  })

  it.each([
    [undefined, 3 / 2],
    ['square', 1],
    ['landscape', 3 / 2],
    ['banner', 2],
    ['portrait', 3 / 4],
    ['story', 9 / 16]
  ] as const)('crops a photo with ratio %s to %d', async (ratio, expected) => {
    await renderAt(DESKTOP, { ...LOOKS['image-start'], ratio })

    const { width, height } = box(
      screen.getByRole('img', { name: /event listing/ })
    )
    expect(width / height).toBeCloseTo(expected, 1)
  })

  it.each(['image-start', 'image-end'] as const)(
    'crops the photo to the %s preset’s default ratio when ratio is unset',
    async (preset) => {
      const defaults = sideBySideDefinition.presets.find(
        (candidate) => candidate.name === preset
      )!.defaults as { ratio: BlockRatio }
      const original = defaults.ratio
      defaults.ratio = 'banner'
      try {
        await renderAt(DESKTOP, { ...LOOKS['image-start'], preset })

        const { width, height } = box(
          screen.getByRole('img', { name: /event listing/ })
        )
        expect(width / height).toBeCloseTo(2, 1)
      } finally {
        defaults.ratio = original
      }
    }
  )

  it('sets the image-end image after the text on wide screens, and above it on phones', async () => {
    const props = { ...LOOKS['image-start'], preset: 'image-end' } as const
    await renderAt(DESKTOP, props)
    const image = () => screen.getByRole('img', { name: /event listing/ })
    const heading = () => screen.getByRole('heading', { level: 2 })
    expect(isBeside(heading(), image())).toBe(true)

    cleanup()
    await renderAt(PHONE, props)
    expect(isAbove(image(), heading())).toBe(true)
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

  it.each(['md', 'sm'] as const)(
    'keeps the ratio at %s while narrowing the photo',
    async (size) => {
      const { container } = await renderAt(DESKTOP, {
        ...LOOKS['tinted-panel'],
        size,
        ratio: 'banner'
      })

      const image = box(screen.getByRole('img', { name: /team members/ }))
      expect(image.width / image.height).toBeCloseTo(2, 1)
      const surface = box(
        container.querySelector('[data-slot="block-surface"]')!
      )
      expect(image.width).toBeLessThan(surface.width * 0.45)
    }
  )

  it.each(['image-start', 'image-end'] as const)(
    'gives the %s photo a smaller share of the width at sm than at md',
    async (preset) => {
      const share = (container: HTMLElement) =>
        box(screen.getByRole('img', { name: /team members/ })).width /
        box(container.querySelector('[data-slot="block-surface"]')!).width
      const medium = share(
        (
          await renderAt(DESKTOP, {
            ...LOOKS['tinted-panel'],
            preset,
            size: 'md'
          })
        ).container
      )

      cleanup()
      const small = share(
        (
          await renderAt(DESKTOP, {
            ...LOOKS['tinted-panel'],
            preset,
            size: 'sm'
          })
        ).container
      )
      expect(small).toBeLessThan(medium - 0.05)
    }
  )

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

describe('SideBySide at a mid width', () => {
  it.each([
    ['tinted-panel', /team members/],
    ['image-start', /event listing/]
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

describe('SideBySide at 1440px, as on the live site', () => {
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

describe('SideBySide tinted panel', () => {
  it('sets the description in neutral subtle text on the tinted panel', async () => {
    await atWidth(DESKTOP.width, DESKTOP.height)
    render(
      <>
        <p className='text-subtle'>Neutral reference</p>
        <SideBySide {...LOOKS['tinted-panel']} />
      </>
    )

    expect(
      getComputedStyle(screen.getByText(LOOKS['tinted-panel'].description))
        .color
    ).toBe(getComputedStyle(screen.getByText('Neutral reference')).color)
  })

  it.each(['md', 'sm'] as const)(
    'keeps the body text colour at %s',
    async (size) => {
      const body = () => screen.getByText('Body copy on the panel.')
      const props = {
        ...LOOKS['tinted-panel'],
        body: <p>Body copy on the panel.</p>
      }
      await renderAt(DESKTOP, { ...props, size: 'lg' })
      const large = getComputedStyle(body()).color

      cleanup()
      await renderAt(DESKTOP, { ...props, size })
      expect(getComputedStyle(body()).color).toBe(large)
    }
  )
})

describe('SideBySide accessibility', () => {
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

describe('SideBySide contrast on every panel', () => {
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

  it.each(EMPHASES)('has no axe violations on %s', async (emphasis) => {
    const { container } = await renderAt(DESKTOP, {
      ...LOOKS['image-start'],
      intent: 'brand',
      emphasis
    })

    expect(await axeViolations(container)).toEqual([])
  })
})
