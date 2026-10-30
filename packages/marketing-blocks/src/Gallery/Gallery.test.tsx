import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Gallery } from '.'
import { MarketingBlocksProvider } from '../Provider'

const images = [
  { src: '/brand/photography/01.webp', alt: 'Fans at the front barrier' },
  { src: '/brand/photography/02.webp', alt: 'A drummer under stage lights' },
  { src: '/brand/photography/03.webp', alt: 'A festival crowd at dusk' }
]

const TITLE = 'Join thousands of partners who trust Oztix'

describe('Gallery', () => {
  it.each(['carousel', 'marquee'] as const)(
    'renders the %s under one heading that names it, with each photo once',
    (preset) => {
      render(
        <Gallery
          preset={preset}
          position={4}
          title={TITLE}
          description='From festivals to local venues.'
          images={images}
        />
      )

      const named = screen.getByRole('region', { name: TITLE })
      const section = named.closest('section')!
      expect(screen.getAllByRole('heading')).toHaveLength(1)
      expect(section).toHaveAttribute('data-block', 'gallery')
      expect(section).toHaveAttribute('data-variant', 'image')
      expect(section).toHaveAttribute('data-preset', preset)
      expect(section).toHaveAttribute('data-position', '4')
      expect(
        screen.getByText('From festivals to local venues.')
      ).toBeInTheDocument()
      expect(
        screen.getAllByRole('img').map((img) => img.getAttribute('alt'))
      ).toEqual(images.map(({ alt }) => alt))
    }
  )

  it('names the carousel by the heading, as a carousel of slides', () => {
    render(<Gallery preset='carousel' title={TITLE} images={images} />)

    const carousel = screen.getByRole('region', { name: TITLE })
    expect(carousel).toHaveAttribute('aria-roledescription', 'carousel')
    expect(
      screen
        .getAllByRole('group')
        .map((slide) => slide.getAttribute('aria-label'))
    ).toEqual(['1 of 3', '2 of 3', '3 of 3'])
  })

  it('falls back to the carousel with no preset', () => {
    const { container } = render(<Gallery title={TITLE} images={images} />)

    expect(container.querySelector('section')).toHaveAttribute(
      'data-preset',
      'carousel'
    )
  })

  it('draws its photos with the provider’s renderImage', () => {
    render(
      <MarketingBlocksProvider
        renderImage={({ alt, sizes }) => (
          <img alt={alt} data-sizes={sizes} src='/optimised.webp' />
        )}
      >
        <Gallery title='Our people' images={images.slice(0, 1)} />
      </MarketingBlocksProvider>
    )

    const img = screen.getByRole('img', { name: 'Fans at the front barrier' })
    expect(img).toHaveAttribute('src', '/optimised.webp')
    expect(img.getAttribute('data-sizes')).toMatch(/px/)
  })

  it.each(['carousel', 'marquee'] as const)(
    'shows the same photo twice in the %s when it’s listed twice',
    (preset) => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => {})
      const repeated = [images[0]!, images[0]!]
      const { rerender } = render(
        <Gallery preset={preset} title='Our people' images={repeated} />
      )
      rerender(
        <Gallery
          preset={preset}
          title='Our people'
          images={[...repeated, images[1]!]}
        />
      )

      expect(
        screen.getAllByRole('img', { name: 'Fans at the front barrier' })
      ).toHaveLength(2)
      expect(error).not.toHaveBeenCalled()
      error.mockRestore()
    }
  )

  const track = () =>
    document.querySelector<HTMLElement>('[data-slot=marquee]')!
      .lastElementChild as HTMLElement

  it('pauses and plays the marquee from its button', async () => {
    render(<Gallery preset='marquee' title={TITLE} images={images} />)

    expect(track().style.animationPlayState).toBe('running')
    await userEvent.click(screen.getByRole('button', { name: 'Pause gallery' }))
    expect(track().style.animationPlayState).toBe('paused')

    await userEvent.click(screen.getByRole('button', { name: 'Play gallery' }))
    const button = screen.getByRole('button', { name: 'Pause gallery' })
    expect(button).toHaveFocus()
    await userEvent.unhover(button)
    fireEvent.blur(button)
    expect(track().style.animationPlayState).toBe('running')
  })

  it('holds the marquee still while focus is inside it', () => {
    render(<Gallery preset='marquee' title={TITLE} images={images} />)

    fireEvent.focus(screen.getByRole('button', { name: 'Pause gallery' }))
    expect(track().style.animationPlayState).toBe('paused')
    fireEvent.blur(screen.getByRole('button', { name: 'Pause gallery' }))
    expect(track().style.animationPlayState).toBe('running')
  })

  it('sets its intent on the block and the pause control', () => {
    const { container } = render(
      <Gallery preset='marquee' intent='brand' title={TITLE} images={images} />
    )

    expect(container.querySelector('section')).toHaveAttribute(
      'data-intent',
      'brand'
    )
    expect(screen.getByRole('button', { name: 'Pause gallery' })).toHaveClass(
      'intent-brand'
    )
  })

  describe('shared props', () => {
    it.each(['carousel', 'marquee'] as const)(
      'sets the %s actions under the photos, the first strong',
      (preset) => {
        render(
          <Gallery
            preset={preset}
            intent='brand'
            title={TITLE}
            images={images}
            actions={[
              { label: 'Become a partner', href: '/partners' },
              { label: 'See events', href: '/events' }
            ]}
          />
        )

        const links = screen.getAllByRole('link')
        expect(links.map((link) => link.textContent)).toEqual([
          'Become a partner',
          'See events'
        ])
        expect(links[0]).toHaveClass('intent-brand')
        const lastImage = screen.getAllByRole('img').at(-1)!
        expect(
          lastImage.compareDocumentPosition(links[0]!) &
            Node.DOCUMENT_POSITION_FOLLOWING
        ).toBeTruthy()
      }
    )

    it.each(['carousel', 'marquee'] as const)(
      'draws no surface on %s by default, and the emphasis asked for as a band or inset panel',
      (preset) => {
        const { container, rerender } = render(
          <Gallery preset={preset} title={TITLE} images={images} />
        )
        const surface = () =>
          container.querySelector('[data-slot=block-surface]')
        expect(surface()).toBeNull()

        rerender(
          <Gallery
            preset={preset}
            emphasis='subtle'
            title={TITLE}
            images={images}
          />
        )
        expect(surface()).toHaveClass('emphasis-subtle')
        expect(surface()).toHaveAttribute('data-shape', 'band')

        rerender(
          <Gallery
            preset={preset}
            emphasis='raised'
            inset
            title={TITLE}
            images={images}
          />
        )
        expect(surface()).toHaveAttribute('data-shape', 'panel')
      }
    )
  })
})
