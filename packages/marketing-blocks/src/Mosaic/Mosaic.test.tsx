import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Mosaic } from '.'
import { MarketingBlocksProvider } from '../Provider'
import { logoStrip, partnerTiers } from './fixtures'

describe('Mosaic', () => {
  it('renders tiers as a section named by its start-aligned heading', () => {
    render(<Mosaic {...partnerTiers} position={3} />)

    const section = screen.getByRole('region', {
      name: 'Industry partnerships'
    })
    expect(section).toHaveAttribute('data-block', 'mosaic')
    expect(section).toHaveAttribute('data-variant', 'static')
    expect(section).toHaveAttribute('data-preset', 'tiers')
    expect(section).toHaveAttribute('data-position', '3')
    expect(
      screen.getByRole('heading', { level: 2, name: 'Industry partnerships' })
    ).toBeInTheDocument()
  })

  it('lists each partner as its logo and level, with the photo behind left unread', () => {
    render(<Mosaic {...partnerTiers} />)

    const [first] = screen.getAllByRole('listitem')
    expect(
      within(first!).getByRole('img', { name: 'Ochre Kite Weekender logo' })
    ).toBeInTheDocument()
    expect(within(first!).getByText('Presenting partner')).toBeInTheDocument()
    expect(within(first!).getAllByRole('img')).toHaveLength(1)
    expect(first!.querySelectorAll('img')).toHaveLength(2)
  })

  it('names a tile with no logo or label by its name alone', () => {
    render(
      <Mosaic
        {...partnerTiers}
        tiles={[
          { name: 'Kazoo Hollow Room', image: partnerTiers.tiles[1]!.image }
        ]}
        logoTile={undefined}
      />
    )

    const [tile] = screen.getAllByRole('listitem')
    expect(tile!.textContent).toBe('Kazoo Hollow Room')
    expect(within(tile!).queryByRole('img')).toBeNull()
    expect(tile!.querySelector('[data-slot=mark]')).toBeNull()
  })

  it('sets a tile without a photo on a plain surface', () => {
    const first = partnerTiers.tiles[0]!
    render(
      <Mosaic
        {...partnerTiers}
        tiles={[{ ...first, image: undefined }]}
        logoTile={undefined}
      />
    )

    const [tile] = screen.getAllByRole('listitem')
    expect(tile!.querySelectorAll('img')).toHaveLength(1)
    expect(
      within(tile!).getByRole('img', { name: first.logo.alt })
    ).toBeInTheDocument()
    expect(within(tile!).getByText(first.label)).toBeInTheDocument()
  })

  it('marks featured partners so they span two columns', () => {
    render(<Mosaic {...partnerTiers} />)

    const featured = screen
      .getAllByRole('listitem')
      .filter((item) => item.hasAttribute('data-featured'))
    expect(featured).toHaveLength(
      partnerTiers.tiles.filter((partner) => partner.featured).length
    )
  })

  it('keeps repeated partners and logos as distinct tiles', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const partner = partnerTiers.tiles[0]!
    const logo = partnerTiers.logoTile.logos[0]!
    render(
      <Mosaic
        {...partnerTiers}
        tiles={[partner, partner]}
        logoTile={{ logos: [logo, logo] }}
      />
    )

    expect(screen.getAllByText(partner.label)).toHaveLength(2)
    expect(screen.getAllByRole('img', { name: logo.alt })).toHaveLength(2)
    expect(error).not.toHaveBeenCalled()
    error.mockRestore()
  })

  it('ends with the also-supporting logos, titled "Also supporting" by default', () => {
    render(<Mosaic {...partnerTiers} />)

    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(partnerTiers.tiles.length + 1)
    const also = items.at(-1)!
    expect(
      within(also).getByRole('heading', { level: 3, name: 'Also supporting' })
    ).toBeInTheDocument()
    expect(
      within(also)
        .getAllByRole('img')
        .map((img) => img.getAttribute('alt'))
    ).toEqual(partnerTiers.logoTile!.logos.map((logo) => logo.alt))
  })

  it('titles the also tile as given, and leaves it out with no also', () => {
    const { rerender } = render(
      <Mosaic
        {...partnerTiers}
        logoTile={{
          title: 'Friends of Oztix',
          logos: partnerTiers.logoTile!.logos
        }}
      />
    )
    expect(
      screen.getByRole('heading', { level: 3, name: 'Friends of Oztix' })
    ).toBeInTheDocument()

    rerender(<Mosaic {...partnerTiers} logoTile={undefined} />)
    expect(screen.queryByRole('heading', { level: 3 })).toBeNull()
    expect(screen.getAllByRole('listitem')).toHaveLength(
      partnerTiers.tiles.length
    )
  })

  it("draws every image with the provider's renderImage", () => {
    render(
      <MarketingBlocksProvider
        renderImage={({ alt }) => <img alt={alt} src='/optimised.webp' />}
      >
        <Mosaic {...partnerTiers} />
      </MarketingBlocksProvider>
    )

    for (const img of document.querySelectorAll('img'))
      expect(img).toHaveAttribute('src', '/optimised.webp')
  })

  it('reports no click from a tile, which holds no links', async () => {
    const onBlockEvent = vi.fn()
    render(
      <MarketingBlocksProvider onBlockEvent={onBlockEvent}>
        <Mosaic {...partnerTiers} position={2} />
      </MarketingBlocksProvider>
    )

    await userEvent.click(screen.getByText('Presenting partner'))

    expect(screen.queryByRole('link')).toBeNull()
    expect(onBlockEvent).not.toHaveBeenCalled()
  })

  describe('logo-strip', () => {
    it('renders the logo-strip preset in the static variant', () => {
      render(<Mosaic {...logoStrip} />)

      const section = screen.getByRole('region', { name: logoStrip.title })
      expect(section).toHaveAttribute('data-variant', 'static')
      expect(section).toHaveAttribute('data-preset', 'logo-strip')
    })

    it('lists each tile as its logo, or its name where it has none', () => {
      render(<Mosaic {...logoStrip} />)

      const items = screen.getAllByRole('listitem')
      expect(items).toHaveLength(logoStrip.tiles.length)
      expect(
        screen.getAllByRole('img').map((img) => img.getAttribute('alt'))
      ).toEqual(
        logoStrip.tiles.flatMap((tile) => (tile.logo ? [tile.logo.alt] : []))
      )
      expect(items.at(-1)).toHaveTextContent('Velcro Pelican Productions')
    })

    it('ignores photos, labels, featuring and the logo tile', () => {
      render(
        <Mosaic
          {...logoStrip}
          tiles={partnerTiers.tiles}
          logoTile={partnerTiers.logoTile}
        />
      )

      expect(screen.getAllByRole('listitem')).toHaveLength(
        partnerTiers.tiles.length
      )
      expect(document.querySelectorAll('img')).toHaveLength(
        partnerTiers.tiles.length
      )
      expect(screen.queryByText(partnerTiers.tiles[0]!.label)).toBeNull()
      expect(screen.queryByRole('heading', { level: 3 })).toBeNull()
      expect(document.querySelector('[data-featured]')).toBeNull()
    })

    it('gives a logo with no height a valid sizes', () => {
      const renderImage = vi.fn(({ alt }: { alt: string }) => (
        <img alt={alt} src='/optimised.webp' />
      ))
      render(
        <MarketingBlocksProvider renderImage={renderImage}>
          <Mosaic
            {...logoStrip}
            tiles={[
              {
                name: 'Kerosene Pony Collective',
                logo: { ...logoStrip.tiles[0]!.logo!, height: 0 }
              }
            ]}
          />
        </MarketingBlocksProvider>
      )

      expect(renderImage.mock.calls[0]![0]).toHaveProperty(
        'sizes',
        expect.stringMatching(/^\d+(\.\d+)?px$/)
      )
    })

    it('falls back to the name for a logo with no alt text', () => {
      render(
        <Mosaic
          {...logoStrip}
          tiles={[
            {
              name: 'Kerosene Pony Collective',
              logo: { ...logoStrip.tiles[0]!.logo!, alt: '' }
            }
          ]}
        />
      )

      expect(
        screen.getByRole('img', { name: 'Kerosene Pony Collective' })
      ).toBeInTheDocument()
    })
  })
})
