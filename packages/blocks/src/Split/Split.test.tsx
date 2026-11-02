import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Split } from '.'
import { BlocksProvider } from '../Provider'

const tintedPanel = {
  preset: 'image-start',
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
  preset: 'image-start',
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
  preset: 'stats',
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

const surfaceOf = (section: HTMLElement) =>
  section.querySelector('[data-slot="block-surface"]')

describe('Split', () => {
  it('renders image-start as a media split with its image first, then heading, body and action', () => {
    render(<Split {...mediaText} position={4} />)

    const section = screen.getByRole('region', { name: mediaText.title })
    expect(section).toHaveAttribute('data-block', 'split')
    expect(section).toHaveAttribute('data-preset', 'image-start')
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

  it('falls back to image-start with no preset', () => {
    render(<Split title={mediaText.title} image={mediaText.image} />)

    expect(
      screen.getByRole('region', { name: mediaText.title })
    ).toHaveAttribute('data-preset', 'image-start')
  })

  it('keeps the image first in reading order in image-end', () => {
    render(<Split {...mediaText} preset='image-end' />)

    const section = screen.getByRole('region', { name: mediaText.title })
    const image = within(section).getByRole('img')
    const heading = within(section).getByRole('heading', { level: 2 })
    expect(
      image.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
  })

  it('leaves out stats beside an image, and the image in stats', () => {
    const { unmount } = render(
      <Split {...mediaText} stats={textAndStats.stats} />
    )
    expect(screen.queryByText('By the numbers')).toBeNull()
    unmount()

    render(<Split {...textAndStats} image={mediaText.image} />)
    expect(screen.queryByRole('img')).toBeNull()
  })

  it('sets stats beside the body, action and stats aside', () => {
    render(<Split {...textAndStats} image={mediaText.image} />)

    const section = screen.getByRole('region', { name: 'Who we are' })
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
      <BlocksProvider onBlockEvent={onBlockEvent}>
        <Split {...mediaText} position={1} />
      </BlocksProvider>
    )

    await userEvent.click(screen.getByRole('link', { name: 'Set it up' }))

    expect(onBlockEvent).toHaveBeenCalledWith({
      action: 'click',
      block: 'split',
      preset: 'image-start',
      position: 1,
      label: 'Set it up',
      href: '/spotify'
    })
  })

  it("draws its images with the provider's renderImage", () => {
    render(
      <BlocksProvider
        renderImage={({ alt }) => <img alt={alt} src='/optimised.webp' />}
      >
        <Split {...tintedPanel} />
      </BlocksProvider>
    )

    expect(
      screen.getByRole('img', { name: tintedPanel.image.alt })
    ).toHaveAttribute('src', '/optimised.webp')
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
      ['image-start', undefined, 'panel'],
      ['image-end', false, 'band'],
      ['stats', undefined, 'panel']
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
          />
        )

        expect(surfaceOf(screen.getByRole('region'))).toHaveAttribute(
          'data-shape',
          shape
        )
      }
    )

    it.each(['image-start', 'image-end', 'stats'] as const)(
      'draws %s with no surface unless an emphasis is set',
      (preset) => {
        render(<Split preset={preset} title='Section' />)

        expect(surfaceOf(screen.getByRole('region'))).toBeNull()
      }
    )
  })
})
