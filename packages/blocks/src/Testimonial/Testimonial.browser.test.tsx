import type { ComponentType } from 'react'

import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { commands, userEvent } from 'vitest/browser'

import { Testimonial } from '.'
import {
  DESKTOP,
  atWidth,
  axeViolations,
  centreOf,
  fontSizeOf,
  photo,
  textAlignOf,
  widths,
  withBrowserPage
} from '../_test/browser'
import { MINIMUM_LC, MODES, setMode, textContrast } from '../_test/contrast'
import { describeBlockFrame } from '../_test/frame'
import { carousel, quote as fixture } from './fixtures'

withBrowserPage()

describeBlockFrame(
  'testimonial',
  'quote',
  Testimonial as ComponentType<never>,
  { quotes: [{ quote: 'Brilliant.', person: { name: 'Mia Tran' } }] }
)

const first = fixture.quotes[0]!
const quote = {
  ...fixture,
  quotes: [
    {
      ...first,
      person: {
        ...first.person,
        image: photo('Portrait of Mia Tran', 128, 128)
      },
      organisation: {
        ...first.organisation,
        logo: photo('Thimble Orbit Presents logo', 120, 40)
      }
    }
  ],
  image: photo('', 1600, 900)
}

const rectOf = (element: Element) => element.getBoundingClientRect()

describe('Testimonial align and size', () => {
  const heading = () => screen.getByRole('heading', { level: 2 })

  it('centres the heading and quote by default, and starts them when asked', () => {
    const { rerender } = render(<Testimonial {...quote} />)
    expect(textAlignOf(heading())).toBe('center')
    expect(textAlignOf(screen.getByRole('blockquote'))).toBe('center')

    rerender(<Testimonial {...quote} align='start' />)
    expect(textAlignOf(heading())).toBe('start')
    expect(textAlignOf(screen.getByRole('blockquote'))).toBe('start')
  })

  it('sets the title smaller at md, and again at sm', async () => {
    await atWidth(DESKTOP.width, DESKTOP.height)
    const { rerender } = render(<Testimonial {...quote} />)
    const large = fontSizeOf(heading())

    rerender(<Testimonial {...quote} size='md' />)
    expect(fontSizeOf(heading())).toBeLessThan(large)
    const medium = fontSizeOf(heading())

    rerender(<Testimonial {...quote} size='sm' />)
    expect(fontSizeOf(heading())).toBeLessThan(medium)
  })

  it('centres its action under the quote', async () => {
    await atWidth(DESKTOP.width, DESKTOP.height)
    render(
      <Testimonial
        {...quote}
        actions={[{ label: 'Read the case study', href: '/case-studies' }]}
      />
    )

    const link = screen.getByRole('link', { name: 'Read the case study' })
    expect(
      Math.abs(centreOf(link) - centreOf(heading().parentElement!))
    ).toBeLessThan(2)
  })
})

describe('Testimonial quote layout', () => {
  it.each([
    { ...widths[0], portrait: 80 },
    { name: 'mid', width: 640, height: 900, portrait: 120 },
    { ...widths[1], portrait: 120 }
  ])(
    'sets a $portrait px portrait beside the name at $name width',
    async ({ width, height, portrait }) => {
      await atWidth(width, height)
      render(<Testimonial {...quote} />)

      const photoBox = rectOf(
        screen.getByRole('img', { name: 'Portrait of Mia Tran' }).parentElement!
      )
      const name = rectOf(screen.getByText('Mia Tran'))
      expect(photoBox.width).toBeCloseTo(portrait, 0)
      expect(photoBox.height).toBeCloseTo(portrait, 0)
      expect(name.left).toBeGreaterThan(photoBox.right)
      expect(Math.round(name.top)).toBeGreaterThanOrEqual(
        Math.round(photoBox.top)
      )
    }
  )

  it('centres the quote in a 42rem measure, as on the website, with the background photo spanning the block', async () => {
    await atWidth(DESKTOP.width, DESKTOP.height)
    const { container } = render(<Testimonial {...quote} />)

    const section = rectOf(
      container.querySelector('[data-slot=block-surface]')!
    )
    const blockquote = rectOf(screen.getByRole('blockquote'))
    const background = rectOf(
      container.querySelector(`img[src="${quote.image.src}"]`)!
    )
    expect(blockquote.width).toBeLessThanOrEqual(672)
    expect(blockquote.left - section.left).toBeCloseTo(
      section.right - blockquote.right,
      0
    )
    expect(background.width).toBeCloseTo(section.width, 0)
    expect(background.height).toBeCloseTo(section.height, 0)
  })

  it('crops a sized portrait and background to their frames', async () => {
    await atWidth(DESKTOP.width, DESKTOP.height)
    const { container } = render(
      <Testimonial
        {...quote}
        quotes={[
          {
            ...quote.quotes[0]!,
            person: {
              ...quote.quotes[0]!.person,
              image: photo('Portrait of Mia Tran', 400, 800)
            }
          }
        ]}
        image={photo('', 400, 400)}
      />
    )

    const portrait = screen.getByRole('img', { name: 'Portrait of Mia Tran' })
    const frame = rectOf(portrait.parentElement!)
    expect(rectOf(portrait).height).toBeLessThanOrEqual(frame.height)
    expect(rectOf(portrait).width).toBeCloseTo(rectOf(portrait).height, 0)

    const surface = container.querySelector('[data-slot=block-surface]')!
    const section = rectOf(surface)
    const background = rectOf(surface.querySelector(':scope > img')!)
    expect(background.width).toBeCloseTo(section.width, 0)
    expect(background.height).toBeCloseTo(section.height, 0)
  })

  it('keeps a large organisation logo to a small mark under the role', async () => {
    await atWidth(DESKTOP.width, DESKTOP.height)
    render(
      <Testimonial
        {...quote}
        quotes={[
          {
            ...quote.quotes[0]!,
            organisation: {
              name: 'Thimble Orbit Presents',
              logo: photo('Thimble Orbit Presents logo', 400, 200)
            }
          }
        ]}
      />
    )

    const logo = rectOf(
      screen.getByRole('img', { name: 'Thimble Orbit Presents logo' })
    )
    expect(logo.height).toBeLessThanOrEqual(48)
    expect(logo.width).toBeCloseTo(logo.height * 2, 0)
  })

  it('pads only inside a background photo, and sits flush without one', async () => {
    await atWidth(DESKTOP.width, DESKTOP.height)
    const { container, rerender } = render(<Testimonial {...quote} />)
    const gapAbove = () =>
      rectOf(screen.getByRole('heading', { level: 2 })).top -
      rectOf(container.querySelector('section')!).top

    expect(gapAbove()).toBeGreaterThan(0)

    rerender(<Testimonial {...quote} image={undefined} />)
    expect(gapAbove()).toBe(0)
  })
})

describe('Testimonial accessibility', () => {
  it.each(widths)(
    'quote has no axe violations at $name width',
    async ({ width, height }) => {
      await atWidth(width, height)
      const { container } = render(
        <main>
          <Testimonial {...quote} />
        </main>
      )

      expect(await axeViolations(container)).toEqual([])
    }
  )
})

describe('Testimonial contrast', () => {
  afterEach(() => setMode('light'))

  const cases = MODES.flatMap((theme) =>
    ([undefined, 'raised', 'normal', 'subtle', 'subtler'] as const).flatMap(
      (emphasis) =>
        (
          [
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
          ] as const
        ).map((intent) => ({
          theme,
          emphasis: emphasis ?? 'none',
          intent: intent ?? 'none',
          props: { emphasis, intent }
        }))
    )
  )

  it.each(cases)(
    'keeps APCA contrast in $theme mode, emphasis $emphasis, intent $intent',
    async ({ theme, props }) => {
      await atWidth(DESKTOP.width, DESKTOP.height)
      setMode(theme)
      render(
        <div className='bg-normal'>
          <Testimonial
            {...quote}
            {...props}
            quotes={[
              {
                ...quote.quotes[0]!,
                organisation: { name: 'Thimble Orbit Presents' }
              }
            ]}
            image={undefined}
          />
        </div>
      )

      const large = [
        screen.getByRole('heading', { level: 2 }),
        screen.getByRole('blockquote').querySelector('p')!
      ]
      const body = [
        screen.getByText(quote.description),
        screen.getByText('Mia Tran'),
        screen.getByText('Head of Programming'),
        screen.getByText('Thimble Orbit Presents')
      ]
      for (const element of large)
        expect(
          textContrast(element),
          element.textContent!
        ).toBeGreaterThanOrEqual(MINIMUM_LC.large)
      for (const element of body)
        expect(
          textContrast(element),
          element.textContent!
        ).toBeGreaterThanOrEqual(MINIMUM_LC.body)
    }
  )

  it.each(['raised', 'subtle', 'subtler'] as const)(
    'has no axe violations on a %s band',
    async (emphasis) => {
      const { container } = render(
        <main>
          <Testimonial {...quote} emphasis={emphasis} intent='brand' />
        </main>
      )

      expect(await axeViolations(container)).toEqual([])
    }
  )

  it.each([
    { ...widths[0], radius: '0px' },
    { name: 'wide', width: 1440, height: 900, radius: '24px' }
  ])(
    'runs the band to the block’s edges, rounding only once the block is wide ($name)',
    async ({ width, height, radius }) => {
      await atWidth(width, height)
      const { container } = render(<Testimonial {...quote} emphasis='subtle' />)

      const band = container.querySelector('[data-slot=block-surface]')!
      expect(band).toHaveAttribute('data-shape', 'band')
      expect(getComputedStyle(band).borderTopLeftRadius).toBe(radius)
      if (radius === '0px')
        expect(band.getBoundingClientRect().width).toBeCloseTo(width, 0)
    }
  )

  it('keeps a contained panel inside the page padding, rounded on a phone', async () => {
    await atWidth(widths[0].width, widths[0].height)
    const { container } = render(
      <Testimonial {...quote} emphasis='subtle' contained />
    )

    const panel = container.querySelector('[data-slot=block-surface]')!
    expect(panel.getBoundingClientRect().width).toBeLessThan(widths[0].width)
    expect(getComputedStyle(panel).borderTopLeftRadius).not.toBe('0px')
  })

  it.each([true, false])(
    'has no axe violations with actions, contained %s',
    async (contained) => {
      const { container } = render(
        <main>
          <Testimonial
            {...quote}
            emphasis='raised'
            contained={contained}
            intent='brand'
            actions={[{ label: 'Read the case study', href: '/case-studies' }]}
          />
        </main>
      )

      expect(await axeViolations(container)).toEqual([])
    }
  )

  it('pads its content inside the band', async () => {
    await atWidth(DESKTOP.width, DESKTOP.height)
    const { container } = render(
      <Testimonial {...quote} image={undefined} emphasis='subtle' />
    )

    expect(
      screen.getByRole('heading', { level: 2 }).getBoundingClientRect().top -
        container.querySelector('section')!.getBoundingClientRect().top
    ).toBeGreaterThan(0)
  })
})

describe('Testimonial quote mark', () => {
  const mark = () =>
    getComputedStyle(screen.getByRole('blockquote'), '::before')

  it('tucks the mark behind a centred quote', async () => {
    await atWidth(DESKTOP.width, DESKTOP.height)
    render(<Testimonial {...quote} />)

    expect(parseFloat(mark().marginBottom)).toBeLessThan(0)
  })

  it('sets the mark clear above a start-aligned quote', async () => {
    await atWidth(DESKTOP.width, DESKTOP.height)
    render(<Testimonial {...quote} align='start' />)

    expect(parseFloat(mark().marginBottom)).toBeGreaterThanOrEqual(0)
  })
})

describe('Testimonial carousel', () => {
  it('steps through the quotes with dots alone', async () => {
    // Embla animates by frame, which crawls on a loaded machine; reduced motion jumps.
    await commands.reducedMotion(true)
    await atWidth(DESKTOP.width, DESKTOP.height)
    render(<Testimonial {...carousel} image={undefined} />)

    const dots = await screen.findAllByRole('button', {
      name: /^Go to slide \d$/
    })
    expect(dots).toHaveLength(carousel.quotes.length)
    expect(screen.queryByRole('button', { name: /next|previous/i })).toBeNull()

    await userEvent.click(dots[1]!)
    const shown = (text: string) => {
      const quote = screen.getByText(text).getBoundingClientRect()
      const viewport = document
        .querySelector('[data-slot=carousel-content]')!
        .getBoundingClientRect()
      return quote.left >= viewport.left && quote.right <= viewport.right
    }
    await expect.poll(() => shown(carousel.quotes[1]!.quote)).toBe(true)
    expect(shown(carousel.quotes[0]!.quote)).toBe(false)
  })

  it('clips the slides sideways only, so the quote mark above each quote shows', async () => {
    await atWidth(DESKTOP.width, DESKTOP.height)
    render(<Testimonial {...carousel} image={undefined} />)

    const viewport = getComputedStyle(
      document.querySelector('[data-slot=carousel-content]')!
    )
    expect(viewport.overflowX).toBe('clip')
    expect(viewport.overflowY).toBe('visible')
  })

  it('centres the dots under the quote', async () => {
    await atWidth(DESKTOP.width, DESKTOP.height)
    render(<Testimonial {...carousel} image={undefined} />)

    const dots = await screen.findByRole('group', {
      name: 'Choose slide to display'
    })
    expect(
      Math.abs(
        centreOf(dots) -
          centreOf(screen.getAllByRole('figure', { hidden: true })[0]!)
      )
    ).toBeLessThan(2)
  })

  it('has no axe violations', async () => {
    const { container } = render(
      <main>
        <Testimonial {...carousel} image={undefined} />
      </main>
    )

    await screen.findAllByRole('button', { name: /^Go to slide \d$/ })
    expect(await axeViolations(container)).toEqual([])
  })
})
