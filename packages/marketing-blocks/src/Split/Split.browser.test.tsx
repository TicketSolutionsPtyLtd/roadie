import { cleanup, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Split, type SplitPreset, type SplitProps } from '.'
import {
  DESKTOP,
  PHONE,
  atWidth,
  axeViolations,
  photo,
  withBrowserPage
} from '../_test/browser'

withBrowserPage()

const PRESETS = {
  'tinted-panel': {
    preset: 'tinted-panel',
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
    preset: 'text-and-stats',
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
  'logo-lockup': {
    preset: 'logo-lockup',
    title: 'Resell my tickets',
    description: 'Sell your tickets through our resale partner.',
    body: <p>The safest way to resell tickets to any event you can't make.</p>,
    actions: [{ label: 'Resell my tickets', href: '/resell' }],
    partner: { name: 'Partner', logo: photo('Partner logo', 208, 60) }
  }
} satisfies Record<SplitPreset, SplitProps>

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

describe('Split layout', () => {
  it('sets the tinted-panel image beside the text on wide screens, and above it on phones', async () => {
    await renderAt(DESKTOP, PRESETS['tinted-panel'])
    const image = () => screen.getByRole('img', { name: /team members/ })
    const heading = () => screen.getByRole('heading', { level: 2 })
    expect(isBeside(image(), heading())).toBe(true)

    cleanup()
    await renderAt(PHONE, PRESETS['tinted-panel'])
    expect(isAbove(image(), heading())).toBe(true)
  })

  it('sets the media-text image beside the text in equal halves on wide screens, and above it on phones', async () => {
    await renderAt(DESKTOP, PRESETS['media-text'])
    const image = () => screen.getByRole('img', { name: /event listing/ })
    const heading = () => screen.getByRole('heading', { level: 2 })
    expect(isBeside(image(), heading())).toBe(true)
    expect(box(image()).width).toBeCloseTo(
      box(heading().parentElement!).width,
      -1
    )

    cleanup()
    await renderAt(PHONE, PRESETS['media-text'])
    expect(isAbove(image(), heading())).toBe(true)
  })

  it('crops a sized media-text photo to 4 by 3', async () => {
    await renderAt(DESKTOP, PRESETS['media-text'])

    const { width, height } = box(
      screen.getByRole('img', { name: /event listing/ })
    )
    expect(width / height).toBeCloseTo(4 / 3, 1)
  })

  it('sets the text-and-stats aside beside the text on wide screens, and wraps it below on phones', async () => {
    await renderAt(DESKTOP, PRESETS['text-and-stats'])
    const body = () => screen.getByText(/hosted in Australia/)
    const aside = () => screen.getByRole('heading', { name: 'By the numbers' })
    expect(isBeside(body(), aside())).toBe(true)

    cleanup()
    await renderAt(PHONE, PRESETS['text-and-stats'])
    expect(isAbove(body(), aside())).toBe(true)
  })

  it('sets the partner lockup beside the title on wide screens, and above it on phones', async () => {
    await renderAt(DESKTOP, PRESETS['logo-lockup'])
    const lockup = () => screen.getByRole('img', { name: 'Partner logo' })
    const heading = () => screen.getByRole('heading', { level: 1 })
    expect(isBeside(lockup(), heading())).toBe(true)

    cleanup()
    await renderAt(PHONE, PRESETS['logo-lockup'])
    expect(isAbove(lockup(), heading())).toBe(true)
  })

  it('crops a sized tinted-panel photo to 8 by 5', async () => {
    await renderAt(DESKTOP, PRESETS['tinted-panel'])

    const { width, height } = box(
      screen.getByRole('img', { name: /team members/ })
    )
    expect(width / height).toBeCloseTo(8 / 5, 1)
  })

  it('gives a tinted-panel with no image the whole panel for its text', async () => {
    const { container } = await renderAt(DESKTOP, {
      ...PRESETS['tinted-panel'],
      image: undefined
    })

    const section = box(container.querySelector('section')!)
    const heading = screen.getByRole('heading', { level: 2 }).parentElement!
    expect(box(heading).width).toBeGreaterThan(section.width * 0.8)
  })

  it('overlaps the heart on both logos, centred between them', async () => {
    const { container } = await renderAt(DESKTOP, PRESETS['logo-lockup'])

    const oztix = box(screen.getByRole('img', { name: 'Oztix' }))
    const partner = box(screen.getByRole('img', { name: 'Partner logo' }))
    const heart = box(
      [...container.querySelectorAll('svg')].find(
        (svg) => !svg.closest('[role="img"]')
      )!
    )
    expect(heart.top).toBeLessThan(oztix.bottom)
    expect(heart.bottom).toBeGreaterThan(partner.top)
    expect(oztix.height).toBeCloseTo(partner.height, 0)
    expect((heart.left + heart.right) / 2).toBeCloseTo(
      (partner.left + partner.right) / 2,
      0
    )
  })
})

const MID = { width: 640, height: 800 }

describe('Split at a mid width', () => {
  it.each([
    ['tinted-panel', /team members/, 2],
    ['media-text', /event listing/, 2],
    ['logo-lockup', 'Partner logo', 1]
  ] as const)(
    'sets the %s media beside the text at 640px',
    async (preset, name, level) => {
      await renderAt(MID, PRESETS[preset])

      expect(
        isBeside(
          screen.getByRole('img', { name }),
          screen.getByRole('heading', { level })
        )
      ).toBe(true)
    }
  )

  it('keeps the text-and-stats aside below the text at 640px, where a stat would not fit beside it', async () => {
    await renderAt(MID, PRESETS['text-and-stats'])

    expect(
      isAbove(
        screen.getByText(/hosted in Australia/),
        screen.getByRole('heading', { name: 'By the numbers' })
      )
    ).toBe(true)
  })

  it.each(Object.values(PRESETS))(
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

describe('Split tinted panel', () => {
  it('sets the description and body in neutral subtle text on the tinted panel', async () => {
    await atWidth(DESKTOP.width, DESKTOP.height)
    render(
      <>
        <p className='text-subtle'>Neutral reference</p>
        <Split
          {...PRESETS['tinted-panel']}
          body={<p>Body copy on the panel.</p>}
        />
      </>
    )

    const neutral = getComputedStyle(
      screen.getByText('Neutral reference')
    ).color
    expect(
      getComputedStyle(screen.getByText(PRESETS['tinted-panel'].description))
        .color
    ).toBe(neutral)
    expect(
      getComputedStyle(screen.getByText('Body copy on the panel.')).color
    ).toBe(neutral)
  })
})

describe('Split accessibility', () => {
  it.each(Object.values(PRESETS))(
    'has no axe violations as $preset',
    async (props) => {
      const { container } = await renderAt(DESKTOP, props)

      expect(await axeViolations(container)).toEqual([])
    }
  )
})
