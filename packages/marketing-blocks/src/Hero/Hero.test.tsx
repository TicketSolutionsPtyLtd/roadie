import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Hero } from '.'
import { MarketingBlocksProvider } from '../Provider'
import { pageHeader, pageHero } from './fixtures'

describe('Hero', () => {
  it('opens the page with its title as the h1, marking the highlighted words', () => {
    render(<Hero {...pageHero()} />)

    const heading = screen.getByRole('heading', {
      level: 1,
      name: 'Australia’s ticketing partner'
    })
    expect(
      within(heading).getByText('Australia’s').closest('mark')
    ).toHaveClass('intent-brand-secondary')
    expect(
      screen.getByRole('region', { name: 'Australia’s ticketing partner' })
    ).toBe(heading.closest('section'))
  })

  it('names the page-hero preset and its media variant', () => {
    render(<Hero {...pageHero()} position={1} />)

    const section = screen.getByRole('region')
    expect(section).toHaveAttribute('data-block', 'hero')
    expect(section).toHaveAttribute('data-variant', 'media')
    expect(section).toHaveAttribute('data-preset', 'page-hero')
    expect(section).toHaveAttribute('data-position', '1')
  })

  it('shows the subtitle and each action as a link, first one first', () => {
    render(<Hero {...pageHero()} />)

    expect(screen.getByText(/Australian owned and hosted/)).toBeInTheDocument()
    const links = screen.getAllByRole('link')
    expect(links.map((link) => link.textContent)).toEqual([
      'Talk to us',
      'Create my event'
    ])
    expect(links[0]).toHaveAttribute('href', '/contact/sales')
  })

  it('shows the first people and event photos with their alt text, loaded only once seen', () => {
    render(<Hero {...pageHero()} />)

    for (const name of [
      'The Oztix team at Antler Kettle Hall',
      'A band on stage at Kazoo Hollow Room'
    ])
      expect(screen.getByRole('img', { name })).not.toHaveAttribute(
        'fetchpriority',
        'high'
      )
    expect(
      screen.queryByRole('img', {
        name: 'Event crew waving at Jumbuck Orchard Park'
      })
    ).toBeNull()
  })

  it('draws the background photo as decoration, loaded first', () => {
    const { container } = render(<Hero {...pageHero()} />)

    const background = container.querySelector('[data-slot=hero-heading] img')
    expect(background).toHaveAttribute('alt', '')
    expect(background).toHaveAttribute('fetchpriority', 'high')
  })

  it('plays the video muted and looping, with its poster and both sources', () => {
    const { container } = render(<Hero {...pageHero()} />)

    const video = container.querySelector('video')!
    expect(video).toHaveAttribute('autoplay')
    expect(video).toHaveAttribute('loop')
    expect(video).toHaveAttribute('playsinline')
    expect(video.muted).toBe(true)
    expect(video).toHaveAccessibleName('Highlights from Ochre Kite Weekender')
    expect(
      [...video.querySelectorAll('source')].map((source) =>
        source.getAttribute('src')
      )
    ).toEqual(['/videos/showreel-av1.mp4', '/videos/showreel-h264.mp4'])
  })

  it('draws its photos and the video’s poster with the provider’s renderImage, only the background loaded first', () => {
    const { container } = render(
      <MarketingBlocksProvider
        renderImage={({ src, alt, priority }) => (
          <img
            alt={alt}
            data-src={src}
            data-priority={priority}
            src='/optimised.webp'
          />
        )}
      >
        <Hero {...pageHero()} />
      </MarketingBlocksProvider>
    )

    const drawn = [...container.querySelectorAll('img')]
    expect(
      drawn.every((img) => img.getAttribute('src') === '/optimised.webp')
    ).toBe(true)
    expect(
      drawn
        .filter((img) => img.dataset.priority === 'true')
        .map((img) => img.dataset.src)
    ).toEqual([pageHero().backgroundImage!.src])
    expect(
      container.querySelector(
        `[data-slot=hero-video] img[data-src="${pageHero().video!.poster.src}"]`
      )
    ).toHaveAttribute('alt', '')
    expect(container.querySelector('video')).not.toHaveAttribute('poster')
  })

  it('reports a click on an action through the provider', async () => {
    const onBlockEvent = vi.fn()
    render(
      <MarketingBlocksProvider onBlockEvent={onBlockEvent}>
        <Hero {...pageHero()} position={1} />
      </MarketingBlocksProvider>
    )

    await userEvent.click(screen.getByRole('link', { name: 'Talk to us' }))

    expect(onBlockEvent).toHaveBeenCalledWith({
      action: 'click',
      block: 'hero',
      variant: 'media',
      preset: 'page-hero',
      position: 1,
      label: 'Talk to us',
      href: '/contact/sales'
    })
  })

  describe('page-header', () => {
    it('shows the eyebrow and the title as the h1, with no media', () => {
      const { container } = render(<Hero {...pageHeader} />)

      expect(
        screen.getByRole('heading', { level: 1, name: pageHeader.title })
      ).toBeInTheDocument()
      expect(screen.getByText('Our mission')).not.toHaveRole('heading')
      expect(container.querySelector('img, video')).toBeNull()
    })

    it('names the page-header preset and its text variant', () => {
      render(<Hero {...pageHeader} />)

      const section = screen.getByRole('region', { name: pageHeader.title })
      expect(section).toHaveAttribute('data-variant', 'text')
      expect(section).toHaveAttribute('data-preset', 'page-header')
    })

    it('ignores media given to it', () => {
      const { container } = render(
        <Hero {...pageHero()} preset='page-header' />
      )

      expect(container.querySelector('img, video')).toBeNull()
    })
  })

  it('falls back to page-hero with no preset', () => {
    render(<Hero {...pageHero()} preset={undefined} />)

    expect(screen.getByRole('region')).toHaveAttribute(
      'data-preset',
      'page-hero'
    )
  })
})
