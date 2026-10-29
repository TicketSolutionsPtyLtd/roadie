import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Split } from '.'
import { MarketingBlocksProvider } from '../Provider'

const featureRow = {
  preset: 'tinted-panel',
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
  preset: 'text-and-stats',
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

const partnerSpotlight = {
  preset: 'logo-lockup',
  title: 'Resell my tickets',
  description: 'Sell your tickets through our resale partner.',
  body: <p>The safest way to resell tickets to any event you can't make.</p>,
  actions: [{ label: 'Resell my tickets', href: 'https://resale.example.com' }],
  partner: {
    name: 'Partner',
    logo: { src: '/partner.svg', alt: 'Partner logo', width: 208 }
  }
} as const

describe('Split', () => {
  it('renders tinted-panel as a media split with its heading, description and image', () => {
    render(<Split {...featureRow} position={4} />)

    const section = screen.getByRole('region', { name: featureRow.title })
    expect(section).toHaveAttribute('data-block', 'split')
    expect(section).toHaveAttribute('data-variant', 'media')
    expect(section).toHaveAttribute('data-preset', 'tinted-panel')
    expect(section).toHaveAttribute('data-position', '4')
    expect(
      within(section).getByRole('heading', { level: 2, name: featureRow.title })
    ).toBeInTheDocument()
    expect(
      within(section).getByText(featureRow.description)
    ).toBeInTheDocument()
    expect(
      within(section).getByRole('img', { name: featureRow.image.alt })
    ).toHaveAttribute('src', '/team.webp')
  })

  it('puts the tinted-panel image before the heading in reading order', () => {
    render(<Split {...featureRow} />)

    const image = screen.getByRole('img', { name: featureRow.image.alt })
    const heading = screen.getByRole('heading', { name: featureRow.title })
    expect(
      image.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
  })

  it('renders media-text as a media split with its image first, then heading, body and action', () => {
    render(<Split {...mediaText} />)

    const section = screen.getByRole('region', { name: mediaText.title })
    expect(section).toHaveAttribute('data-variant', 'media')
    expect(section).toHaveAttribute('data-preset', 'media-text')
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

  it('renders text-and-stats as a stats split, with the body, action and stats aside', () => {
    render(<Split {...textAndStats} />)

    const section = screen.getByRole('region', { name: 'Who we are' })
    expect(section).toHaveAttribute('data-variant', 'stats')
    expect(section).toHaveAttribute('data-preset', 'text-and-stats')
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
      within(section).getByRole('heading', { level: 3, name: 'By the numbers' })
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

  it('renders text-and-stats without an aside when it has no stats', () => {
    render(<Split {...textAndStats} stats={undefined} />)

    expect(screen.queryByRole('list')).toBeNull()
    expect(screen.queryByRole('heading', { name: 'By the numbers' })).toBeNull()
  })

  it('opens the page with logo-lockup: its title is the h1, beside both logos', () => {
    render(<Split {...partnerSpotlight} />)

    const section = screen.getByRole('region', { name: 'Resell my tickets' })
    expect(section).toHaveAttribute('data-variant', 'media')
    expect(section).toHaveAttribute('data-preset', 'logo-lockup')
    expect(
      within(section).getByRole('heading', {
        level: 1,
        name: 'Resell my tickets'
      })
    ).toBeInTheDocument()
    expect(
      within(section).getByRole('img', { name: 'Oztix' })
    ).toBeInTheDocument()
    expect(
      within(section).getByRole('img', { name: 'Partner logo' })
    ).toHaveAttribute('src', '/partner.svg')
    expect(
      within(section).getByText(
        "The safest way to resell tickets to any event you can't make."
      )
    ).toBeInTheDocument()
  })

  it("names the partner's logo by the partner when the logo has no alt", () => {
    render(
      <Split
        {...partnerSpotlight}
        partner={{ name: 'Partner', logo: { src: '/partner.svg', alt: '' } }}
      />
    )

    expect(screen.getByRole('img', { name: 'Partner' })).toHaveAttribute(
      'src',
      '/partner.svg'
    )
  })

  it('falls back to tinted-panel with no preset', () => {
    render(<Split title={featureRow.title} image={featureRow.image} />)

    expect(
      screen.getByRole('region', { name: featureRow.title })
    ).toHaveAttribute('data-preset', 'tinted-panel')
  })

  it('reports a click on its action with the label and href', async () => {
    const onBlockEvent = vi.fn()
    render(
      <MarketingBlocksProvider onBlockEvent={onBlockEvent}>
        <Split {...partnerSpotlight} position={1} />
      </MarketingBlocksProvider>
    )

    await userEvent.click(
      screen.getByRole('link', { name: /Resell my tickets/ })
    )

    expect(onBlockEvent).toHaveBeenCalledWith({
      action: 'click',
      block: 'split',
      variant: 'media',
      preset: 'logo-lockup',
      position: 1,
      label: expect.stringContaining('Resell my tickets'),
      href: 'https://resale.example.com'
    })
  })

  it("draws its images with the provider's renderImage", () => {
    render(
      <MarketingBlocksProvider
        renderImage={({ alt }) => <img alt={alt} src='/optimised.webp' />}
      >
        <Split {...featureRow} />
      </MarketingBlocksProvider>
    )

    expect(
      screen.getByRole('img', { name: featureRow.image.alt })
    ).toHaveAttribute('src', '/optimised.webp')
  })
})
