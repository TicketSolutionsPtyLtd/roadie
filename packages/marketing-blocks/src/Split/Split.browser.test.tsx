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
  'feature-row': {
    preset: 'feature-row',
    title: 'Specialist teams powering venues and event organisers',
    description:
      'Teams in innovation, operations, marketing, events, and finance.',
    image: photo('Two team members working together at a desk', 1280, 1007)
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
  'partner-spotlight': {
    preset: 'partner-spotlight',
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
  it('sets the feature-row image beside the text on wide screens, and above it on phones', async () => {
    await renderAt(DESKTOP, PRESETS['feature-row'])
    const image = () => screen.getByRole('img', { name: /team members/ })
    const heading = () => screen.getByRole('heading', { level: 2 })
    expect(isBeside(image(), heading())).toBe(true)

    cleanup()
    await renderAt(PHONE, PRESETS['feature-row'])
    expect(isAbove(image(), heading())).toBe(true)
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
    await renderAt(DESKTOP, PRESETS['partner-spotlight'])
    const lockup = () => screen.getByRole('img', { name: 'Partner logo' })
    const heading = () => screen.getByRole('heading', { level: 1 })
    expect(isBeside(lockup(), heading())).toBe(true)

    cleanup()
    await renderAt(PHONE, PRESETS['partner-spotlight'])
    expect(isAbove(lockup(), heading())).toBe(true)
  })

  it('gives a feature-row with no image the whole panel for its text', async () => {
    const { container } = await renderAt(DESKTOP, {
      ...PRESETS['feature-row'],
      image: undefined
    })

    const section = box(container.querySelector('section')!)
    const heading = screen.getByRole('heading', { level: 2 }).parentElement!
    expect(box(heading).width).toBeGreaterThan(section.width * 0.8)
  })

  it('overlaps the heart on both logos, centred between them', async () => {
    const { container } = await renderAt(DESKTOP, PRESETS['partner-spotlight'])

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

describe('Split accessibility', () => {
  it.each(Object.values(PRESETS))(
    'has no axe violations as $preset',
    async (props) => {
      const { container } = await renderAt(DESKTOP, props)

      expect(await axeViolations(container)).toEqual([])
    }
  )
})
