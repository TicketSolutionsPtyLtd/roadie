import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Mosaic } from '.'
import { BlocksProvider } from '../Provider'
import { partnerTiles } from './fixtures'

describe('Mosaic', () => {
  it('renders tiles as a section named by its start-aligned heading', () => {
    render(<Mosaic {...partnerTiles} position={3} />)

    const section = screen.getByRole('region', {
      name: 'Industry partnerships'
    })
    expect(section).toHaveAttribute('data-block', 'mosaic')
    expect(section).toHaveAttribute('data-preset', 'tiles')
    expect(section).toHaveAttribute('data-position', '3')
    expect(
      screen.getByRole('heading', { level: 2, name: 'Industry partnerships' })
    ).toBeInTheDocument()
  })

  it('lists each partner as its logo and level, with the photo behind left unread', () => {
    render(<Mosaic {...partnerTiles} />)

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
        {...partnerTiles}
        tiles={[
          { title: 'Kazoo Hollow Room', image: partnerTiles.tiles[1]!.image }
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
    const first = partnerTiles.tiles[0]!
    render(
      <Mosaic
        {...partnerTiles}
        tiles={[{ ...first, image: undefined }]}
        logoTile={undefined}
      />
    )

    const [tile] = screen.getAllByRole('listitem')
    expect(tile!.querySelectorAll('img')).toHaveLength(1)
    expect(
      within(tile!).getByRole('img', { name: first.logo.alt })
    ).toBeInTheDocument()
    expect(within(tile!).getByText(first.description)).toBeInTheDocument()
  })

  it('marks large partners so they span two columns', () => {
    render(<Mosaic {...partnerTiles} />)

    const large = screen
      .getAllByRole('listitem')
      .filter((item) => item.getAttribute('data-size') === 'lg')
    expect(large).toHaveLength(
      partnerTiles.tiles.filter((partner) => partner.size === 'lg').length
    )
  })

  it('keeps repeated partners and logos as distinct tiles', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const partner = partnerTiles.tiles[0]!
    const logo = partnerTiles.logoTile.logos[0]!
    render(
      <Mosaic
        {...partnerTiles}
        tiles={[partner, partner]}
        logoTile={{ logos: [logo, logo] }}
      />
    )

    expect(screen.getAllByText(partner.description)).toHaveLength(2)
    expect(screen.getAllByRole('img', { name: logo.alt })).toHaveLength(2)
    expect(error).not.toHaveBeenCalled()
    error.mockRestore()
  })

  it('ends with the logo tile, under its title', () => {
    render(<Mosaic {...partnerTiles} />)

    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(partnerTiles.tiles.length + 1)
    const also = items.at(-1)!
    expect(
      within(also).getByRole('heading', { level: 3, name: 'Also supporting' })
    ).toBeInTheDocument()
    expect(
      within(also)
        .getAllByRole('img')
        .map((img) => img.getAttribute('alt'))
    ).toEqual(partnerTiles.logoTile!.logos.map((logo) => logo.alt))
  })

  it('titles the logo tile as given, leaves the title out without one, and the tile out with no logo tile', () => {
    const { rerender } = render(
      <Mosaic
        {...partnerTiles}
        logoTile={{
          title: 'Friends of Oztix',
          logos: partnerTiles.logoTile!.logos
        }}
      />
    )
    expect(
      screen.getByRole('heading', { level: 3, name: 'Friends of Oztix' })
    ).toBeInTheDocument()

    rerender(
      <Mosaic
        {...partnerTiles}
        logoTile={{ logos: partnerTiles.logoTile!.logos }}
      />
    )
    expect(screen.queryByRole('heading', { level: 3 })).toBeNull()
    expect(screen.getAllByRole('listitem')).toHaveLength(
      partnerTiles.tiles.length + 1
    )

    rerender(<Mosaic {...partnerTiles} logoTile={undefined} />)
    expect(screen.queryByRole('heading', { level: 3 })).toBeNull()
    expect(screen.getAllByRole('listitem')).toHaveLength(
      partnerTiles.tiles.length
    )
  })

  it("draws every image with the provider's renderImage", () => {
    render(
      <BlocksProvider
        renderImage={({ alt }) => <img alt={alt} src='/optimised.webp' />}
      >
        <Mosaic {...partnerTiles} />
      </BlocksProvider>
    )

    for (const img of document.querySelectorAll('img'))
      expect(img).toHaveAttribute('src', '/optimised.webp')
  })

  it('reports no click from a tile, which holds no links', async () => {
    const onBlockEvent = vi.fn()
    render(
      <BlocksProvider onBlockEvent={onBlockEvent}>
        <Mosaic {...partnerTiles} position={2} />
      </BlocksProvider>
    )

    await userEvent.click(screen.getByText('Presenting partner'))

    expect(screen.queryByRole('link')).toBeNull()
    expect(onBlockEvent).not.toHaveBeenCalled()
  })

  describe('intent and links', () => {
    it('marks tile labels neutral by default, and in the block intent', () => {
      const { container, rerender } = render(<Mosaic {...partnerTiles} />)
      const label = () => screen.getByText(partnerTiles.tiles[0]!.description)

      expect(container.querySelector('section')).not.toHaveAttribute(
        'data-intent'
      )
      expect(label()).toHaveClass('intent-neutral')

      rerender(<Mosaic {...partnerTiles} intent='brand' />)
      expect(container.querySelector('section')).toHaveAttribute(
        'data-intent',
        'brand'
      )
      expect(label()).toHaveClass('intent-brand')
    })

    it('makes a linked tile one link named by the tile, reported by name', async () => {
      const onBlockEvent = vi.fn()
      const [first, second] = partnerTiles.tiles
      render(
        <BlocksProvider onBlockEvent={onBlockEvent}>
          <Mosaic
            {...partnerTiles}
            tiles={[{ ...first!, href: '/partners/ochre-kite' }, second!]}
            logoTile={undefined}
          />
        </BlocksProvider>
      )

      const [linked, plain] = screen.getAllByRole('listitem')
      const link = within(linked!).getByRole('link', { name: first!.title })
      expect(link).toHaveAttribute('data-interactive-target')
      expect(linked).toHaveClass('is-interactive-within')
      expect(plain).not.toHaveClass('is-interactive-within')
      expect(within(plain!).queryByRole('link')).toBeNull()

      await userEvent.click(link)
      expect(onBlockEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'click',
          label: first!.title,
          href: '/partners/ochre-kite'
        })
      )
    })

    it('links a tile without a logo through its name', () => {
      render(
        <Mosaic
          {...partnerTiles}
          tiles={[
            {
              title: 'Kazoo Hollow Room',
              href: '/venues/kazoo-hollow-room',
              image: partnerTiles.tiles[1]!.image
            }
          ]}
          logoTile={undefined}
        />
      )

      expect(
        screen.getByRole('link', { name: 'Kazoo Hollow Room' })
      ).toHaveTextContent('Kazoo Hollow Room')
    })
  })

  describe('shared props', () => {
    it('marks a tile in its own intent over the block’s', () => {
      const [first, second] = partnerTiles.tiles
      render(
        <Mosaic
          {...partnerTiles}
          intent='brand'
          tiles={[{ ...first!, intent: 'success' }, second!]}
        />
      )

      expect(screen.getByText(first!.description)).toHaveClass('intent-success')
      expect(screen.getByText(second!.description)).toHaveClass('intent-brand')
    })

    it('sets its actions under the tiles, the first strong in the block intent', () => {
      render(
        <Mosaic
          {...partnerTiles}
          intent='brand'
          actions={[{ label: 'Become a partner', href: '/partners' }]}
        />
      )

      const link = screen.getByRole('link', { name: 'Become a partner' })
      expect(link).toHaveClass('intent-brand')
      expect(
        screen.getAllByRole('list')[0]!.compareDocumentPosition(link) &
          Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy()
    })

    it('draws no surface by default, and the emphasis asked for as a band or contained panel', () => {
      const { container, rerender } = render(<Mosaic {...partnerTiles} />)
      const surface = () => container.querySelector('[data-slot=block-surface]')
      expect(surface()).toBeNull()

      rerender(<Mosaic {...partnerTiles} emphasis='subtler' />)
      expect(surface()).toHaveClass('emphasis-subtler')
      expect(surface()).toHaveAttribute('data-shape', 'band')

      rerender(<Mosaic {...partnerTiles} emphasis='raised' contained />)
      expect(surface()).toHaveAttribute('data-shape', 'panel')
    })
  })
})
