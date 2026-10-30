import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Split, type SplitRow } from '.'
import { MarketingBlocksProvider } from '../Provider'

const tintedPanel = {
  preset: 'media-text',
  size: 'md',
  emphasis: 'subtle',
  intent: 'info',
  contained: true,
  title: 'Specialist teams powering venues and event organisers',
  description:
    'Teams in innovation, operations, marketing, events, and finance, all working to one partnership promise.',
  image: {
    src: '/team.webp',
    alt: 'Two team members working together at a desk with large monitors',
    width: 1280,
    height: 1007
  }
} as const

const mediaText = {
  preset: 'media-text',
  title: 'Get your gig on Spotify',
  body: <p>Your events show on artist profiles where fans already listen.</p>,
  actions: [{ label: 'Set it up', href: '/spotify' }],
  image: {
    src: '/spotify.webp',
    alt: 'An event listing on an artist profile',
    width: 1200,
    height: 900
  }
} as const

const textAndStats = {
  preset: 'media-text',
  title: 'Who we are',
  body: (
    <>
      <h3>Australian owned and operated</h3>
      <p>Our platform is hosted in Australia and built in-house.</p>
    </>
  ),
  actions: [{ label: 'Meet the team', href: '/about/team' }],
  stats: {
    title: 'By the numbers',
    description: 'The impact of genuine partnerships',
    items: [
      { value: '33,000,000+', label: 'tickets sold', illustration: 'Ticket' },
      { value: '22,000+', label: 'event organisers', illustration: 'MapPin' }
    ]
  }
} as const

const values: SplitRow[] = [
  {
    title: 'Proactive touch',
    subtitle: 'See it coming',
    description: 'We spot issues early.',
    image: { src: '/one.jpg', alt: 'A team at a desk' }
  },
  {
    title: 'Positive energy',
    subtitle: 'Lift spirits',
    description: 'We love what we do.',
    image: { src: '/two.jpg', alt: 'Three partners smiling' }
  }
]

const surfaceOf = (section: HTMLElement) =>
  section.querySelector('[data-slot="block-surface"]')

describe('Split', () => {
  it('renders media-text as a media split with its image first, then heading, body and action', () => {
    render(<Split {...mediaText} position={4} />)

    const section = screen.getByRole('region', { name: mediaText.title })
    expect(section).toHaveAttribute('data-block', 'split')
    expect(section).toHaveAttribute('data-variant', 'media')
    expect(section).toHaveAttribute('data-preset', 'media-text')
    expect(section).toHaveAttribute('data-position', '4')
    const image = within(section).getByRole('img', {
      name: mediaText.image.alt
    })
    const heading = within(section).getByRole('heading', {
      level: 2,
      name: mediaText.title
    })
    expect(
      image.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
    expect(within(section).getByText(/fans already listen/)).toBeInTheDocument()
    expect(
      within(section).getByRole('link', { name: 'Set it up' })
    ).toHaveAttribute('href', '/spotify')
  })

  it('falls back to media-text with no preset', () => {
    render(<Split title={mediaText.title} image={mediaText.image} />)

    expect(
      screen.getByRole('region', { name: mediaText.title })
    ).toHaveAttribute('data-preset', 'media-text')
  })

  it('sets stats in place of the image, with the body, action and stats aside', () => {
    render(<Split {...textAndStats} image={mediaText.image} />)

    const section = screen.getByRole('region', { name: 'Who we are' })
    expect(section).toHaveAttribute('data-variant', 'media')
    expect(within(section).queryByRole('img')).toBeNull()
    expect(
      within(section).getByRole('heading', {
        level: 3,
        name: 'Australian owned and operated'
      })
    ).toBeInTheDocument()
    expect(
      within(section).getByRole('link', { name: 'Meet the team' })
    ).toHaveAttribute('href', '/about/team')
    expect(
      within(section).getByRole('heading', {
        level: 3,
        name: 'By the numbers'
      })
    ).toBeInTheDocument()
    expect(
      within(section).getByText('The impact of genuine partnerships')
    ).toBeInTheDocument()
    expect(
      within(section)
        .getAllByRole('listitem')
        .map((item) => item.textContent)
    ).toEqual(['33,000,000+tickets sold', '22,000+event organisers'])
  })

  it('reports a click on its action with the label and href', async () => {
    const onBlockEvent = vi.fn()
    render(
      <MarketingBlocksProvider onBlockEvent={onBlockEvent}>
        <Split {...mediaText} position={1} />
      </MarketingBlocksProvider>
    )

    await userEvent.click(screen.getByRole('link', { name: 'Set it up' }))

    expect(onBlockEvent).toHaveBeenCalledWith({
      action: 'click',
      block: 'split',
      variant: 'media',
      preset: 'media-text',
      position: 1,
      label: 'Set it up',
      href: '/spotify'
    })
  })

  it("draws its images with the provider's renderImage", () => {
    render(
      <MarketingBlocksProvider
        renderImage={({ alt }) => <img alt={alt} src='/optimised.webp' />}
      >
        <Split {...tintedPanel} />
      </MarketingBlocksProvider>
    )

    expect(
      screen.getByRole('img', { name: tintedPanel.image.alt })
    ).toHaveAttribute('src', '/optimised.webp')
  })

  describe('alternating rows', () => {
    it('renders its rows as h3s under the block’s h2, each with its image', () => {
      render(
        <Split preset='alternating-rows' title='Our values' items={values} />
      )

      const section = screen.getByRole('region', { name: 'Our values' })
      expect(section).toHaveAttribute('data-variant', 'rows')
      expect(section).toHaveAttribute('data-preset', 'alternating-rows')
      expect(within(section).getAllByRole('listitem')).toHaveLength(2)
      expect(
        screen.getByRole('heading', { level: 3, name: 'Proactive touch' })
      ).toBeInTheDocument()
      expect(screen.getByText('Lift spirits')).toBeInTheDocument()
      expect(screen.getByText('We love what we do.')).toBeInTheDocument()
      expect(
        screen.getByRole('img', { name: 'Three partners smiling' })
      ).toHaveAttribute('src', '/two.jpg')
    })

    it('links a row by its title and reports the title alone as the click label', async () => {
      const onBlockEvent = vi.fn()
      render(
        <MarketingBlocksProvider onBlockEvent={onBlockEvent}>
          <Split
            preset='alternating-rows'
            title='Our values'
            items={[{ ...values[0]!, href: '/values/proactive' }, values[1]!]}
          />
        </MarketingBlocksProvider>
      )

      const link = screen.getByRole('link', { name: 'Proactive touch' })
      expect(
        screen.getByRole('heading', { level: 3, name: 'Proactive touch' })
      ).toContainElement(link)
      await userEvent.click(link)
      expect(onBlockEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          label: 'Proactive touch',
          href: '/values/proactive'
        })
      )
    })

    const markOf = (name: string) =>
      screen.getByText(name).closest('[data-slot="mark"]')

    it('cycles its title marks, or takes the block’s or a row’s intent', () => {
      const three = [
        values[0]!,
        values[1]!,
        { ...values[1]!, title: 'Third', intent: 'success' as const }
      ]
      const { unmount } = render(
        <Split preset='alternating-rows' title='Values' items={three} />
      )
      expect(markOf('Proactive touch')).toHaveClass('intent-info')
      expect(markOf('Positive energy')).toHaveClass('intent-brand')
      expect(markOf('Third')).toHaveClass('intent-success')
      unmount()

      render(
        <Split
          preset='alternating-rows'
          intent='danger'
          title='Values'
          items={three}
        />
      )
      expect(markOf('Proactive touch')).toHaveClass('intent-danger')
      expect(markOf('Positive energy')).toHaveClass('intent-danger')
      expect(markOf('Third')).toHaveClass('intent-success')
    })

    it('draws every row on its item emphasis, and a linked bare row on subtler', () => {
      const { unmount } = render(
        <Split
          preset='alternating-rows'
          itemEmphasis='subtle'
          title='Values'
          items={values}
        />
      )
      for (const row of screen.getAllByRole('listitem'))
        expect(row).toHaveClass('emphasis-subtle')
      unmount()

      render(
        <Split
          preset='alternating-rows'
          title='Values'
          items={[{ ...values[0]!, href: '/values' }, values[1]!]}
        />
      )
      const [linked, plain] = screen.getAllByRole('listitem')
      expect(linked).toHaveClass('emphasis-subtler')
      expect(plain!.className).not.toMatch(/emphasis-/)
    })
  })

  describe('intent and emphasis', () => {
    it('sets the intent on the block', () => {
      render(<Split {...mediaText} intent='brand' />)

      expect(
        screen.getByRole('region', { name: mediaText.title })
      ).toHaveAttribute('data-intent', 'brand')
    })

    it('gives the strong action the intent, or accent without one', () => {
      render(<Split {...mediaText} intent='brand' />)
      render(<Split {...textAndStats} />)

      expect(screen.getByRole('link', { name: 'Set it up' })).toHaveClass(
        'intent-brand'
      )
      expect(screen.getByRole('link', { name: 'Meet the team' })).toHaveClass(
        'intent-accent'
      )
    })

    it('draws the tinted panel as a subtle contained panel in its intent', () => {
      render(<Split {...tintedPanel} />)

      const section = screen.getByRole('region', { name: tintedPanel.title })
      expect(section).toHaveClass('intent-info')
      expect(surfaceOf(section)).toHaveClass('emphasis-subtle')
      expect(surfaceOf(section)).toHaveAttribute('data-shape', 'panel')
    })

    it.each([
      ['media-text', undefined, 'panel'],
      ['media-text', false, 'band'],
      ['alternating-rows', undefined, 'band'],
      ['alternating-rows', true, 'panel']
    ] as const)(
      'draws %s with contained %s as a %s',
      (preset, contained, shape) => {
        render(
          <Split
            preset={preset}
            emphasis='raised'
            contained={contained}
            title='Section'
            image={mediaText.image}
            items={values}
          />
        )

        expect(surfaceOf(screen.getByRole('region'))).toHaveAttribute(
          'data-shape',
          shape
        )
      }
    )

    it.each(['media-text', 'alternating-rows'] as const)(
      'draws %s with no surface unless an emphasis is set',
      (preset) => {
        render(<Split preset={preset} title='Section' items={values} />)

        expect(surfaceOf(screen.getByRole('region'))).toBeNull()
      }
    )
  })
})
