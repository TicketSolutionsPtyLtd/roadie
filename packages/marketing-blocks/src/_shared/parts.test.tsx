import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { MarketingBlocksProvider } from '../Provider'
import { BlockActions } from './BlockActions'
import { BlockHeading } from './BlockHeading'
import { BlockImg } from './BlockImg'

describe('BlockHeading', () => {
  it('renders the title as the level given, with eyebrow and description', () => {
    render(
      <BlockHeading
        level={1}
        eyebrow='Venues and organisers'
        title='Sell more tickets'
        description='Ticketing that works as hard as you do.'
      />
    )

    expect(
      screen.getByRole('heading', { level: 1, name: 'Sell more tickets' })
    ).toBeInTheDocument()
    expect(screen.getByText('Venues and organisers')).toBeInTheDocument()
    expect(
      screen.getByText('Ticketing that works as hard as you do.')
    ).toBeInTheDocument()
  })

  it('marks the highlighted words', () => {
    render(<BlockHeading title='Sell more tickets' titleHighlight='more' />)

    expect(screen.getByText('more').closest('mark')).toBeInTheDocument()
  })
})

describe('BlockActions', () => {
  it('renders each action as a link, in order', () => {
    render(
      <BlockActions
        actions={[
          { label: 'Talk to us', href: '/contact/sales' },
          { label: 'Create my event', href: 'https://studio.oztix.com.au' }
        ]}
      />
    )

    const links = screen.getAllByRole('link')
    expect(links.map((link) => link.textContent)).toEqual([
      'Talk to us',
      'Create my event'
    ])
    expect(links[0]).toHaveAttribute('href', '/contact/sales')
  })

  it('makes the first action the strong accent one and the rest normal', () => {
    render(
      <BlockActions
        actions={[
          { label: 'Talk to us', href: '/contact/sales' },
          { label: 'See pricing', href: '/pricing' },
          { label: 'Read the guide', href: '/guide' }
        ]}
      />
    )

    const [first, ...rest] = screen.getAllByRole('link')
    expect(first).toHaveClass('intent-accent', 'emphasis-strong')
    for (const link of rest) {
      expect(link).toHaveClass('emphasis-normal')
      expect(link).not.toHaveClass('intent-accent')
    }
  })

  it('renders nothing with no actions', () => {
    const { container } = render(<BlockActions actions={[]} />)

    expect(container).toBeEmptyDOMElement()
  })
})

describe('BlockActions on another site', () => {
  it('marks an external link as opening elsewhere', () => {
    render(
      <BlockActions
        actions={[
          { label: 'Talk to us', href: '/contact/sales' },
          { label: 'Resell with Tixel', href: 'https://tixel.com' }
        ]}
      />
    )

    expect(
      screen
        .getByRole('link', { name: /Resell with Tixel/ })
        .querySelector('svg')
    ).not.toBeNull()
    expect(
      screen.getByRole('link', { name: 'Talk to us' }).querySelector('svg')
    ).toBeNull()
  })
})

describe('BlockImg', () => {
  const image = { src: '/crowd.jpg', alt: 'A crowd at a gig', width: 800 }

  it('draws a Roadie image by default', () => {
    render(<BlockImg image={image} sizes='50vw' />)

    expect(
      screen.getByRole('img', { name: 'A crowd at a gig' })
    ).toHaveAttribute('src', '/crowd.jpg')
  })

  it('passes blur data on to renderImage', () => {
    const renderImage = vi.fn(() => null)
    render(
      <MarketingBlocksProvider renderImage={renderImage}>
        <BlockImg
          image={{ ...image, blurDataURL: 'data:image/png;base64,AA' }}
        />
      </MarketingBlocksProvider>
    )

    expect(renderImage).toHaveBeenCalledWith(
      expect.objectContaining({ blurDataURL: 'data:image/png;base64,AA' })
    )
  })

  it("draws with the provider's renderImage when given", () => {
    render(
      <MarketingBlocksProvider
        renderImage={({ alt, sizes }) => (
          <img alt={alt} data-sizes={sizes} src='/optimised.webp' />
        )}
      >
        <BlockImg image={image} sizes='50vw' />
      </MarketingBlocksProvider>
    )

    const img = screen.getByRole('img', { name: 'A crowd at a gig' })
    expect(img).toHaveAttribute('src', '/optimised.webp')
    expect(img).toHaveAttribute('data-sizes', '50vw')
  })
})
