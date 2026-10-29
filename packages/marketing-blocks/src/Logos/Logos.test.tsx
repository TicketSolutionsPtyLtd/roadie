import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Logos } from '.'
import { MarketingBlocksProvider } from '../Provider'
import { partnerTiers } from './testUtils'

describe('Logos', () => {
  it('renders partner-tiers as a section named by its start-aligned heading', () => {
    render(<Logos {...partnerTiers} position={3} />)

    const section = screen.getByRole('region', {
      name: 'Industry partnerships'
    })
    expect(section).toHaveAttribute('data-block', 'logos')
    expect(section).toHaveAttribute('data-variant', 'static')
    expect(section).toHaveAttribute('data-preset', 'partner-tiers')
    expect(section).toHaveAttribute('data-position', '3')
    expect(
      screen.getByRole('heading', { level: 2, name: 'Industry partnerships' })
    ).toBeInTheDocument()
  })

  it('lists each partner as its logo and level, with the photo behind left unread', () => {
    render(<Logos {...partnerTiers} />)

    const [first] = screen.getAllByRole('listitem')
    expect(
      within(first!).getByRole('img', { name: 'Ochre Kite Weekender logo' })
    ).toBeInTheDocument()
    expect(within(first!).getByText('Presenting partner')).toBeInTheDocument()
    expect(within(first!).getAllByRole('img')).toHaveLength(1)
    expect(first!.querySelectorAll('img')).toHaveLength(2)
  })

  it('marks featured partners so they span two columns', () => {
    render(<Logos {...partnerTiers} />)

    const featured = screen
      .getAllByRole('listitem')
      .filter((item) => item.hasAttribute('data-featured'))
    expect(featured).toHaveLength(
      partnerTiers.partners.filter((partner) => partner.featured).length
    )
  })

  it('ends with the also-supporting logos, titled "Also supporting" by default', () => {
    render(<Logos {...partnerTiers} />)

    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(partnerTiers.partners.length + 1)
    const also = items.at(-1)!
    expect(
      within(also).getByRole('heading', { level: 3, name: 'Also supporting' })
    ).toBeInTheDocument()
    expect(
      within(also)
        .getAllByRole('img')
        .map((img) => img.getAttribute('alt'))
    ).toEqual(partnerTiers.also!.logos.map((logo) => logo.alt))
  })

  it('titles the also tile as given, and leaves it out with no also', () => {
    const { rerender } = render(
      <Logos
        {...partnerTiers}
        also={{ title: 'Friends of Oztix', logos: partnerTiers.also!.logos }}
      />
    )
    expect(
      screen.getByRole('heading', { level: 3, name: 'Friends of Oztix' })
    ).toBeInTheDocument()

    rerender(<Logos {...partnerTiers} also={undefined} />)
    expect(screen.queryByRole('heading', { level: 3 })).toBeNull()
    expect(screen.getAllByRole('listitem')).toHaveLength(
      partnerTiers.partners.length
    )
  })

  it("draws every image with the provider's renderImage", () => {
    render(
      <MarketingBlocksProvider
        renderImage={({ alt }) => <img alt={alt} src='/optimised.webp' />}
      >
        <Logos {...partnerTiers} />
      </MarketingBlocksProvider>
    )

    for (const img of document.querySelectorAll('img'))
      expect(img).toHaveAttribute('src', '/optimised.webp')
  })

  it('reports no click from a tile, which holds no links', async () => {
    const onBlockEvent = vi.fn()
    render(
      <MarketingBlocksProvider onBlockEvent={onBlockEvent}>
        <Logos {...partnerTiers} position={2} />
      </MarketingBlocksProvider>
    )

    await userEvent.click(screen.getByText('Presenting partner'))

    expect(screen.queryByRole('link')).toBeNull()
    expect(onBlockEvent).not.toHaveBeenCalled()
  })
})
