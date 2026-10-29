import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Hero } from '.'
import { MarketingBlocksProvider } from '../Provider'
import { bento, imageHero, titleOnly } from './fixtures'

beforeEach(() => {
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('Hero', () => {
  it('opens the page with its title as the h1, marking the highlighted words', () => {
    render(<Hero {...bento()} />)

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

  it('names the bento preset and its media variant', () => {
    render(<Hero {...bento()} position={1} />)

    const section = screen.getByRole('region')
    expect(section).toHaveAttribute('data-block', 'hero')
    expect(section).toHaveAttribute('data-variant', 'media')
    expect(section).toHaveAttribute('data-preset', 'bento')
    expect(section).toHaveAttribute('data-position', '1')
  })

  it('shows the subtitle and each action as a link, first one first', () => {
    render(<Hero {...bento()} />)

    expect(screen.getByText(/Australian owned and hosted/)).toBeInTheDocument()
    const links = screen.getAllByRole('link')
    expect(links.map((link) => link.textContent)).toEqual([
      'Talk to us',
      'Create my event'
    ])
    expect(links[0]).toHaveAttribute('href', '/contact/sales')
  })

  it('shows the first primary and secondary photos with their alt text, loaded only once seen', () => {
    render(<Hero {...bento()} />)

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
    const { container } = render(<Hero {...bento()} />)

    const background = container.querySelector('[data-slot=hero-heading] img')
    expect(background).toHaveAttribute('alt', '')
    expect(background).toHaveAttribute('fetchpriority', 'high')
  })

  it('sets the video muted and looping, with its poster and both sources', () => {
    const { container } = render(<Hero {...bento()} />)

    const video = container.querySelector('video')!
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
        <Hero {...bento()} />
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
    ).toEqual([bento().backgroundImage!.src])
    expect(
      container.querySelector(
        `[data-slot=hero-video] img[data-src="${bento().video!.poster.src}"]`
      )
    ).toHaveAttribute('alt', '')
    expect(container.querySelector('video')).not.toHaveAttribute('poster')
  })

  it('reports a click on an action through the provider', async () => {
    const onBlockEvent = vi.fn()
    render(
      <MarketingBlocksProvider onBlockEvent={onBlockEvent}>
        <Hero {...bento()} position={1} />
      </MarketingBlocksProvider>
    )

    await userEvent.click(screen.getByRole('link', { name: 'Talk to us' }))

    expect(onBlockEvent).toHaveBeenCalledWith({
      action: 'click',
      block: 'hero',
      variant: 'media',
      preset: 'bento',
      position: 1,
      label: 'Talk to us',
      href: '/contact/sales'
    })
  })

  describe('image', () => {
    it('sets the title as the h1 beside its one photo, loaded first', () => {
      const { container } = render(<Hero {...imageHero()} />)

      expect(
        screen.getByRole('heading', {
          level: 1,
          name: 'Sell more tickets with Spotify'
        })
      ).toBeInTheDocument()
      expect(
        screen.getByRole('img', {
          name: 'A crowd singing along at Xylophone Tide Festival'
        })
      ).toHaveAttribute('fetchpriority', 'high')
      expect(container.querySelectorAll('img')).toHaveLength(1)
      expect(container.querySelector('video')).toBeNull()
      expect(screen.getByRole('link', { name: 'Talk to us' })).toHaveAttribute(
        'href',
        '/contact/sales'
      )
    })

    it('names the image preset and the media variant', () => {
      render(<Hero {...imageHero()} />)

      const section = screen.getByRole('region')
      expect(section).toHaveAttribute('data-variant', 'media')
      expect(section).toHaveAttribute('data-preset', 'image')
    })

    it('draws its photo with the provider’s renderImage', () => {
      render(
        <MarketingBlocksProvider
          renderImage={({ alt, priority }) => (
            <img alt={alt} data-priority={priority} src='/optimised.webp' />
          )}
        >
          <Hero {...imageHero()} />
        </MarketingBlocksProvider>
      )

      expect(
        screen.getByRole('img', {
          name: 'A crowd singing along at Xylophone Tide Festival'
        })
      ).toHaveAttribute('data-priority', 'true')
    })
  })

  describe('title', () => {
    it('shows the eyebrow and the title as the h1, with no media', () => {
      const { container } = render(<Hero {...titleOnly} />)

      expect(
        screen.getByRole('heading', { level: 1, name: titleOnly.title })
      ).toBeInTheDocument()
      expect(screen.getByText('Our mission')).not.toHaveRole('heading')
      expect(container.querySelector('img, video')).toBeNull()
    })

    it('names the title preset and its text variant', () => {
      render(<Hero {...titleOnly} />)

      const section = screen.getByRole('region', { name: titleOnly.title })
      expect(section).toHaveAttribute('data-variant', 'text')
      expect(section).toHaveAttribute('data-preset', 'title')
    })

    it('ignores media given to it', () => {
      const { container } = render(<Hero {...bento()} preset='title' />)

      expect(container.querySelector('img, video')).toBeNull()
    })
  })

  it('falls back to bento with no preset', () => {
    render(<Hero {...bento()} preset={undefined} />)

    expect(screen.getByRole('region')).toHaveAttribute('data-preset', 'bento')
  })
})
