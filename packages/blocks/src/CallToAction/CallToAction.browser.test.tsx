import type { ComponentType } from 'react'

import { render, screen } from '@testing-library/react'
import { describe, expect, it, onTestFinished } from 'vitest'
import { page } from 'vitest/browser'

import { CallToAction, type CallToActionProps } from '.'
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
import { describeBlockFrame } from '../_test/frame'

withBrowserPage()

describeBlockFrame(
  'call-to-action',
  'photo',
  CallToAction as ComponentType<never>,
  {}
)

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

const props: CallToActionProps = {
  title: 'Explore an Oztix partnership',
  highlight: 'partnership',
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

describe('CallToAction with photo', () => {
  it('sets the photo above the copy on a phone, breaking out of the panel', async () => {
    await page.viewport(PHONE.width, PHONE.height)
    render(<CallToAction {...props} />)

    const { section, panel, heading, photo } = boxes()
    expect(photo.top).toBeLessThan(panel.top)
    expect(photo.top).toBeGreaterThanOrEqual(section.top)
    expect(photo.bottom).toBeLessThanOrEqual(heading.top)
  })

  it('sets the photo beside the copy on a mid-width screen', async () => {
    await page.viewport(640, 800)
    render(<CallToAction {...props} />)

    const { section, panel, heading, photo } = boxes()
    expect(photo.top).toBeLessThan(panel.top)
    expect(photo.top).toBeGreaterThanOrEqual(section.top)
    expect(photo.left).toBeGreaterThan(heading.left + heading.width / 2)
  })

  it('sets the photo above the copy in a narrow column on a desktop', async () => {
    await page.viewport(DESKTOP.width, DESKTOP.height)
    render(
      <div style={{ width: 400 }}>
        <CallToAction {...props} />
      </div>
    )

    const { heading, photo } = boxes()
    expect(photo.bottom).toBeLessThanOrEqual(heading.top)
  })

  it('sets the photo beside the copy on a desktop, breaking out of the panel', async () => {
    await page.viewport(DESKTOP.width, DESKTOP.height)
    render(<CallToAction {...props} />)

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

  it.each(
    (
      [
        ['a phone', PHONE],
        ['a mid-width screen', { width: 640, height: 800 }],
        ['a desktop', DESKTOP]
      ] as const
    ).flatMap(([name, size]) =>
      (['square', 'portrait'] as const).map(
        (ratio) => [name, ratio, size] as const
      )
    )
  )(
    'keeps the photo and its illustration above the panel’s foot, with short copy, on %s at %s',
    async (_, ratio, size) => {
      await page.viewport(size.width, size.height)
      const { container } = render(
        <CallToAction
          {...props}
          ratio={ratio}
          body={undefined}
          actions={undefined}
          tilted={false}
        />
      )

      const { panel, photo } = boxes()
      const illustration = container
        .querySelector('svg')!
        .getBoundingClientRect()
      expect(photo.bottom).toBeLessThanOrEqual(panel.bottom)
      expect(illustration.bottom).toBeLessThanOrEqual(panel.bottom)
    }
  )

  it.each(['square', 'landscape'] as const)(
    'grows a %s photo to a third of a wide block, beside the copy',
    async (ratio) => {
      await page.viewport(DESKTOP.width, DESKTOP.height)
      render(<CallToAction {...props} ratio={ratio} tilted={false} />)

      const { section, heading, photo } = boxes()
      const copy = screen.getByText(/get-to-know-you/).getBoundingClientRect()
      expect(photo.width).toBeGreaterThan(section.width * 0.28)
      expect(Math.max(heading.right, copy.right)).toBeLessThan(photo.left)
    }
  )

  it('keeps its usual gaps with short copy, centring it beside the photo', async () => {
    await page.viewport(DESKTOP.width, DESKTOP.height)
    render(<CallToAction {...props} tilted={false} />)

    const { panel, heading } = boxes()
    const link = screen
      .getByRole('link', { name: 'Talk to us' })
      .getBoundingClientRect()
    const body = screen.getByText(/get-to-know-you/).getBoundingClientRect()
    expect(body.top - heading.bottom).toBeLessThanOrEqual(56)
    expect(link.top - body.bottom).toBeLessThanOrEqual(56)
    const above = heading.top - panel.top
    const below = panel.bottom - link.bottom
    expect(Math.abs(above - below)).toBeLessThan(4)
  })

  it('keeps the photo above a contained panel’s foot, with short copy', async () => {
    await page.viewport(DESKTOP.width, DESKTOP.height)
    const { container } = render(
      <CallToAction {...props} body={undefined} actions={undefined} contained />
    )

    const { panel } = boxes()
    const illustration = container.querySelector('svg')!.getBoundingClientRect()
    expect(illustration.bottom).toBeLessThanOrEqual(panel.bottom)
  })

  it('has no axe violations', async () => {
    const { container } = render(<CallToAction {...props} />)

    expect(await axeViolations(container)).toEqual([])
  })
})

describe('CallToAction with photo, its photo', () => {
  it.each([
    [undefined, 1],
    ['square', 1],
    ['portrait', 9 / 16],
    ['landscape', 2]
  ] as const)(
    'crops a landscape photo to the %s ratio, %d wide per high',
    async (ratio, expected) => {
      render(<CallToAction {...props} ratio={ratio} />)

      const img = screen.getByRole('img', { name: 'Hands up at a gig' })
      const frame = img.parentElement!
      expect(img.offsetWidth).toBe(frame.clientWidth)
      expect(img.offsetHeight).toBe(frame.clientHeight)
      // The ratio sets the frame's border box; its 4px border sits inside it.
      expect(frame.offsetWidth / frame.offsetHeight).toBeCloseTo(expected, 1)
    }
  )

  const turn = () =>
    getComputedStyle(
      screen.getByRole('img', { name: 'Hands up at a gig' }).parentElement!
        .parentElement!
    ).rotate

  it('tilts the photo by default', async () => {
    await page.viewport(DESKTOP.width, DESKTOP.height)
    render(<CallToAction {...props} />)

    expect(turn()).not.toMatch(/^(none|0deg)$/)
  })

  it('sets the photo straight when tilted is false', async () => {
    await page.viewport(DESKTOP.width, DESKTOP.height)
    render(<CallToAction {...props} tilted={false} />)

    expect(turn()).toMatch(/^(none|0deg)$/)
  })
})

describe('CallToAction long words', () => {
  it.each(['photo', 'centred'] as const)(
    'keeps the %s panel within a phone screen',
    async (preset) => {
      await page.viewport(PHONE.width, PHONE.height)
      render(
        <CallToAction
          {...props}
          preset={preset}
          body={<p>Rock'n'roll at Wooloomooloomooloomooloomooloo</p>}
        />
      )

      const panel = document
        .querySelector('[data-slot=block-surface]')!
        .getBoundingClientRect()
      const body = screen.getByText(/Wooloomooloo/).getBoundingClientRect()
      expect(panel.width).toBeLessThanOrEqual(PHONE.width)
      expect(body.right).toBeLessThanOrEqual(panel.right)
    }
  )
})

describe('CallToAction body', () => {
  it.each(['photo', 'centred'] as const)(
    'sets the %s body in subtle text, closing on a medium-weight line',
    (preset) => {
      render(
        <CallToAction
          preset={preset}
          image={props.image}
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

describe('CallToAction contained with photo', () => {
  it('keeps the photo breaking out of the top of a contained panel', async () => {
    await page.viewport(DESKTOP.width, DESKTOP.height)
    render(<CallToAction {...props} contained />)

    const { section, panel, heading, photo } = boxes()
    expect(photo.top).toBeLessThan(panel.top)
    expect(photo.top).toBeGreaterThanOrEqual(section.top)
    expect(photo.left).toBeGreaterThan(heading.left + heading.width / 2)
    expect(panel.left).toBeGreaterThan(section.left)
  })
})

describe('CallToAction size', () => {
  it('sets the title smaller at md, and again at sm, and the body smaller at md', async () => {
    await page.viewport(DESKTOP.width, DESKTOP.height)
    const { rerender } = render(<CallToAction {...props} />)
    const sizes = () => ({
      title: parseFloat(
        getComputedStyle(screen.getByRole('heading', { level: 2 })).fontSize
      ),
      body: parseFloat(
        getComputedStyle(screen.getByText(/get-to-know-you/)).fontSize
      )
    })
    const large = sizes()

    rerender(<CallToAction {...props} size='md' />)
    const medium = sizes()
    expect(medium.title).toBeLessThan(large.title)
    expect(medium.body).toBeLessThan(large.body)

    rerender(<CallToAction {...props} size='sm' />)
    expect(sizes().title).toBeLessThan(medium.title)
  })
})

describe('CallToAction align', () => {
  it.each([
    {
      preset: 'centred',
      image: undefined,
      align: undefined,
      expected: 'center'
    },
    {
      preset: 'photo',
      image: props.image,
      align: undefined,
      expected: 'start'
    },
    { preset: 'photo', image: undefined, align: undefined, expected: 'start' },
    {
      preset: 'photo',
      image: props.image,
      align: 'center',
      expected: 'center'
    },
    {
      preset: 'centred',
      image: props.image,
      align: 'start',
      expected: 'start'
    }
  ] as const)(
    'sets the $preset copy to the $expected, with align $align',
    ({ preset, image, align, expected }) => {
      render(
        <CallToAction {...props} preset={preset} image={image} align={align} />
      )

      expect(textAlignOf(screen.getByRole('heading', { level: 2 }))).toBe(
        expected
      )
    }
  )
})

describe('CallToAction centred', () => {
  it('centres the heading and actions in the panel', async () => {
    await page.viewport(DESKTOP.width, DESKTOP.height)
    render(<CallToAction {...props} preset='centred' />)

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
    const { container } = render(<CallToAction {...props} preset='centred' />)

    expect(await axeViolations(container)).toEqual([])
  })
})

describe('CallToAction intent and emphasis', () => {
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
        <CallToAction
          intent={intent}
          emphasis={emphasis}
          eyebrow='For organisers'
          title='Talk to our team'
          highlight='team'
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
        <CallToAction
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
