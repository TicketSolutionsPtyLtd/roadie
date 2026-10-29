import { cleanup, render, screen } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import { Split, type SplitProps } from '.'
import {
  axeViolations,
  placeholderImage,
  useBlockStyles
} from '../_shared/browserTesting'

let removeStyles = () => {}
beforeAll(() => {
  removeStyles = useBlockStyles()
})
afterAll(() => removeStyles())
afterEach(() => cleanup())

const PHONE = 375
const DESKTOP = 1280

const PRESETS = {
  'feature-row': {
    preset: 'feature-row',
    title: 'Specialist teams powering venues and event organisers',
    description:
      'Teams in innovation, operations, marketing, events, and finance.',
    image: {
      src: placeholderImage(1280, 1007),
      alt: 'Two team members working together at a desk',
      width: 1280,
      height: 1007
    }
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
    partnerLogo: {
      src: placeholderImage(208, 60),
      alt: 'Partner logo',
      width: 208,
      height: 60
    }
  }
} satisfies Record<NonNullable<SplitProps['preset']>, SplitProps>

function renderAt(width: number, props: SplitProps) {
  return render(
    <div style={{ width }}>
      <Split {...props} />
    </div>
  )
}

const box = (element: Element) => element.getBoundingClientRect()
const isBeside = (first: Element, second: Element) =>
  box(first).right <= box(second).left
const isAbove = (first: Element, second: Element) =>
  box(first).bottom <= box(second).top

describe('Split layout', () => {
  it('sets the feature-row image beside the text on wide screens, and above it on phones', () => {
    renderAt(DESKTOP, PRESETS['feature-row'])
    const image = () => screen.getByRole('img', { name: /team members/ })
    const heading = () => screen.getByRole('heading', { level: 2 })
    expect(isBeside(image(), heading())).toBe(true)

    cleanup()
    renderAt(PHONE, PRESETS['feature-row'])
    expect(isAbove(image(), heading())).toBe(true)
  })

  it('sets the text-and-stats aside beside the text on wide screens, and wraps it below on phones', () => {
    renderAt(DESKTOP, PRESETS['text-and-stats'])
    const body = () => screen.getByText(/hosted in Australia/)
    const aside = () => screen.getByRole('heading', { name: 'By the numbers' })
    expect(isBeside(body(), aside())).toBe(true)

    cleanup()
    renderAt(PHONE, PRESETS['text-and-stats'])
    expect(isAbove(body(), aside())).toBe(true)
  })

  it('sets the partner lockup beside the title on wide screens, and above it on phones', () => {
    renderAt(DESKTOP, PRESETS['partner-spotlight'])
    const lockup = () => screen.getByRole('img', { name: 'Partner logo' })
    const heading = () => screen.getByRole('heading', { level: 1 })
    expect(isBeside(lockup(), heading())).toBe(true)

    cleanup()
    renderAt(PHONE, PRESETS['partner-spotlight'])
    expect(isAbove(lockup(), heading())).toBe(true)
  })

  it('overlaps the heart on both logos, centred between them', () => {
    const { container } = renderAt(DESKTOP, PRESETS['partner-spotlight'])

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
      const { container } = renderAt(DESKTOP, props)

      expect(await axeViolations(container)).toEqual([])
    }
  )
})
