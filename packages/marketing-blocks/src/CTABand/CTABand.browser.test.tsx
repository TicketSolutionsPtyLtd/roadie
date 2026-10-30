import { render, screen } from '@testing-library/react'
import { describe, expect, it, onTestFinished } from 'vitest'
import { page } from 'vitest/browser'

import { CTABand, type CTABandProps } from '.'
import type { BlockIntent } from '../_shared/surface'
import {
  DESKTOP,
  PHONE,
  axeViolations,
  photo,
  textAlignOf,
  withBrowserPage
} from '../_test/browser'
import {
  MINIMUM_FILL_LC,
  MINIMUM_LC,
  MODES,
  fillContrast,
  setMode,
  textContrast
} from '../_test/contrast'

withBrowserPage()

const INTENTS = [
  'neutral',
  'brand',
  'brand-secondary',
  'brand-purple',
  'accent',
  'info',
  'success',
  'warning',
  'danger'
] as const satisfies readonly BlockIntent[]

const props: CTABandProps = {
  title: 'Explore an Oztix partnership',
  titleHighlight: 'partnership',
  body: <p>Let’s start with a get-to-know-you conversation.</p>,
  actions: [
    { label: 'Talk to us', href: '/contact/sales' },
    { label: 'Create my event', href: 'https://studio.oztix.com.au' }
  ],
  image: photo('Hands up at a gig')
}

function boxes() {
  const heading = screen.getByRole('heading', { level: 2 })
  const section = heading.closest('section')!
  return {
    section: section.getBoundingClientRect(),
    panel: section
      .querySelector('[data-slot=block-surface]')!
      .getBoundingClientRect(),
    heading: heading.getBoundingClientRect(),
    photo: screen
      .getByRole('img', { name: 'Hands up at a gig' })
      .parentElement!.getBoundingClientRect()
  }
}

describe('CTABand with photo', () => {
  it('sets the photo above the copy on a phone, breaking out of the panel', async () => {
    await page.viewport(PHONE.width, PHONE.height)
    render(<CTABand {...props} />)

    const { section, panel, heading, photo } = boxes()
    expect(photo.top).toBeLessThan(panel.top)
    expect(photo.top).toBeGreaterThanOrEqual(section.top)
    expect(photo.bottom).toBeLessThanOrEqual(heading.top)
  })

  it('sets the photo beside the copy on a mid-width screen', async () => {
    await page.viewport(640, 800)
    render(<CTABand {...props} />)

    const { section, panel, heading, photo } = boxes()
    expect(photo.top).toBeLessThan(panel.top)
    expect(photo.top).toBeGreaterThanOrEqual(section.top)
    expect(photo.left).toBeGreaterThan(heading.left + heading.width / 2)
  })

  it('sets the photo above the copy in a narrow column on a desktop', async () => {
    await page.viewport(DESKTOP.width, DESKTOP.height)
    render(
      <div style={{ width: 400 }}>
        <CTABand {...props} />
      </div>
    )

    const { heading, photo } = boxes()
    expect(photo.bottom).toBeLessThanOrEqual(heading.top)
  })

  it('sets the photo beside the copy on a desktop, breaking out of the panel', async () => {
    await page.viewport(DESKTOP.width, DESKTOP.height)
    render(<CTABand {...props} />)

    const { section, panel, heading, photo } = boxes()
    expect(photo.top).toBeLessThan(panel.top)
    expect(photo.top).toBeGreaterThanOrEqual(section.top)
    expect(photo.left).toBeGreaterThan(heading.left + heading.width / 2)
    expect(photo.left).toBeGreaterThanOrEqual(
      screen
        .getByRole('link', { name: 'Create my event' })
        .getBoundingClientRect().right
    )
  })

  it('has no axe violations', async () => {
    const { container } = render(<CTABand {...props} />)

    expect(await axeViolations(container)).toEqual([])
  })
})

describe('CTABand with photo, its photo', () => {
  it('crops a landscape photo to the portrait frame', async () => {
    render(<CTABand {...props} />)

    const img = screen.getByRole('img', { name: 'Hands up at a gig' })
    const frame = img.parentElement!
    expect(img.offsetWidth).toBe(frame.clientWidth)
    expect(img.offsetHeight).toBe(frame.clientHeight)
    expect(frame.clientHeight).toBeGreaterThan(frame.clientWidth)
  })
})

describe('CTABand long words', () => {
  it.each([
    ['with a photo', props.image],
    ['without a photo', undefined]
  ])('keeps the panel %s within a phone screen', async (_, image) => {
    await page.viewport(PHONE.width, PHONE.height)
    render(
      <CTABand
        {...props}
        image={image}
        body={<p>Rock'n'roll at Wooloomooloomooloomooloomooloo</p>}
      />
    )

    const panel = document
      .querySelector('[data-slot=block-surface]')!
      .getBoundingClientRect()
    const body = screen.getByText(/Wooloomooloo/).getBoundingClientRect()
    expect(panel.width).toBeLessThanOrEqual(PHONE.width)
    expect(body.right).toBeLessThanOrEqual(panel.right)
  })
})

describe('CTABand body', () => {
  it.each([
    ['with a photo', props.image],
    ['without a photo', undefined]
  ])(
    'sets the body %s in subtle text, closing on a medium-weight line',
    (_, image) => {
      render(
        <CTABand
          image={image}
          title='Explore an Oztix partnership'
          body={
            <>
              <p>Let’s start with a conversation.</p>
              <p>Ready to move fast? We’re on it.</p>
            </>
          }
        />
      )
      const subtle = document.createElement('span')
      subtle.className = 'text-subtle'
      document.body.append(subtle)
      onTestFinished(() => subtle.remove())

      const opening = getComputedStyle(
        screen.getByText('Let’s start with a conversation.')
      )
      const closing = getComputedStyle(
        screen.getByText('Ready to move fast? We’re on it.')
      )
      expect(opening.color).toBe(getComputedStyle(subtle).color)
      expect(opening.fontWeight).toBe('400')
      expect(closing.fontWeight).toBe('500')
    }
  )
})

describe('CTABand contained with photo', () => {
  it('keeps the photo breaking out of the top of a contained panel', async () => {
    await page.viewport(DESKTOP.width, DESKTOP.height)
    render(<CTABand {...props} contained />)

    const { section, panel, heading, photo } = boxes()
    expect(photo.top).toBeLessThan(panel.top)
    expect(photo.top).toBeGreaterThanOrEqual(section.top)
    expect(photo.left).toBeGreaterThan(heading.left + heading.width / 2)
    expect(panel.left).toBeGreaterThan(section.left)
  })
})

describe('CTABand size', () => {
  it('sets the title smaller at md, and again at sm, and the body smaller at md', async () => {
    await page.viewport(DESKTOP.width, DESKTOP.height)
    const { rerender } = render(<CTABand {...props} />)
    const sizes = () => ({
      title: parseFloat(
        getComputedStyle(screen.getByRole('heading', { level: 2 })).fontSize
      ),
      body: parseFloat(
        getComputedStyle(screen.getByText(/get-to-know-you/)).fontSize
      )
    })
    const large = sizes()

    rerender(<CTABand {...props} size='md' />)
    const medium = sizes()
    expect(medium.title).toBeLessThan(large.title)
    expect(medium.body).toBeLessThan(large.body)

    rerender(<CTABand {...props} size='sm' />)
    expect(sizes().title).toBeLessThan(medium.title)
  })
})

describe('CTABand align', () => {
  it.each([
    {
      look: 'without a photo',
      image: undefined,
      align: undefined,
      expected: 'center'
    },
    {
      look: 'beside a photo',
      image: props.image,
      align: undefined,
      expected: 'start'
    },
    {
      look: 'beside a photo',
      image: props.image,
      align: 'center',
      expected: 'center'
    },
    {
      look: 'without a photo',
      image: undefined,
      align: 'start',
      expected: 'start'
    }
  ] as const)(
    'sets the copy $look to the $expected, with align $align',
    ({ image, align, expected }) => {
      render(<CTABand {...props} image={image} align={align} />)

      expect(textAlignOf(screen.getByRole('heading', { level: 2 }))).toBe(
        expected
      )
    }
  )
})

describe('CTABand centred', () => {
  it('centres the heading and actions in the panel', async () => {
    await page.viewport(DESKTOP.width, DESKTOP.height)
    render(<CTABand {...props} image={undefined} />)

    const heading = screen.getByRole('heading', { level: 2 })
    const panel = heading
      .closest('section')!
      .querySelector('[data-slot=block-surface]')!
      .getBoundingClientRect()
    const centre = (box: DOMRect) => box.left + box.width / 2
    const links = screen
      .getAllByRole('link')
      .map((link) => link.getBoundingClientRect())
    const actions = {
      left: links[0]!.left,
      width: links.at(-1)!.right - links[0]!.left
    } as DOMRect

    expect(centre(heading.getBoundingClientRect())).toBeCloseTo(
      centre(panel),
      0
    )
    expect(centre(actions)).toBeCloseTo(centre(panel), 0)
  })

  it('has no axe violations', async () => {
    const { container } = render(<CTABand {...props} image={undefined} />)

    expect(await axeViolations(container)).toEqual([])
  })
})

describe('CTABand intent and emphasis', () => {
  const EMPHASES = [
    'raised',
    'normal',
    'subtle',
    'subtler',
    'strong',
    'inverted'
  ] as const
  const cases = MODES.flatMap((theme) =>
    EMPHASES.flatMap((emphasis) =>
      INTENTS.map((intent) => [emphasis, intent, theme] as const)
    )
  )

  it.each(cases)(
    'keeps its text readable on a %s %s panel in %s mode',
    async (emphasis, intent, theme) => {
      setMode(theme)
      onTestFinished(() => setMode('light'))
      const { container } = render(
        <CTABand
          intent={intent}
          emphasis={emphasis}
          eyebrow='For organisers'
          title='Talk to our team'
          titleHighlight='team'
          description='We’ll find the right setup.'
          body={
            <p>
              Read <a href='/guide'>the setup guide</a> or run{' '}
              <code>oztix import</code>.
            </p>
          }
          actions={props.actions}
        />
      )

      const large = [
        screen.getByRole('heading', { level: 2 }),
        screen.getByText('For organisers'),
        screen.getByText('team')
      ]
      const guide = screen.getByRole('link', { name: 'the setup guide' })
      const body = [
        screen.getByText('We’ll find the right setup.'),
        guide,
        screen.getByText('oztix import'),
        screen.getByRole('link', { name: 'Talk to us' }),
        screen.getByRole('link', { name: 'Create my event' })
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
      expect(getComputedStyle(guide).textDecorationColor).toBe(
        getComputedStyle(guide).color
      )
      expect(await axeViolations(container)).toEqual([])
    }
  )

  it.each(
    MODES.flatMap((theme) =>
      (['strong', 'inverted'] as const).flatMap((emphasis) =>
        INTENTS.map((intent) => [emphasis, intent, theme] as const)
      )
    )
  )(
    'sets the strong action apart from a %s %s panel in %s mode',
    (emphasis, intent, theme) => {
      setMode(theme)
      onTestFinished(() => setMode('light'))
      const { container } = render(
        <CTABand
          intent={intent}
          emphasis={emphasis}
          title='Talk to our team'
          actions={props.actions}
        />
      )

      expect(
        fillContrast(
          screen.getByRole('link', { name: 'Talk to us' }),
          container.querySelector('[data-slot=block-surface]')!
        )
      ).toBeGreaterThanOrEqual(MINIMUM_FILL_LC)
    }
  )
})
