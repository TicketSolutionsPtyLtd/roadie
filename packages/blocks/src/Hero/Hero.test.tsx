import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Hero } from '.'
import { BlocksProvider } from '../Provider'
import { SPOT_ILLUSTRATIONS } from '../_shared/illustrations'
import { bento, imageHero, partnerHero, pathPhoto, titleOnly } from './fixtures'

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

  it('names the bento preset', () => {
    render(<Hero {...bento()} position={1} />)

    const section = screen.getByRole('region')
    expect(section).toHaveAttribute('data-block', 'hero')
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

  it('fills the panel beside the title with the first half of its images, and the panel beside the video with the rest', () => {
    const { container } = render(
      <Hero
        {...bento()}
        images={['One', 'Two', 'Three', 'Four', 'Five'].map((alt) =>
          pathPhoto(alt)
        )}
      />
    )

    const first = (slot: string) =>
      container
        .querySelector(`[data-slot=hero-${slot}] img`)
        ?.getAttribute('alt')
    expect(first('primary')).toBe('One')
    expect(first('secondary')).toBe('Four')
  })

  it('shows the first photo of each panel with its alt text, loaded only once seen', () => {
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
      <BlocksProvider
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
      </BlocksProvider>
    )

    const drawn = [...container.querySelectorAll('img')]
    expect(
      drawn.every((img) => img.getAttribute('src') === '/optimised.webp')
    ).toBe(true)
    expect(
      drawn
        .filter((img) => img.dataset.priority === 'true')
        .map((img) => img.dataset.src)
    ).toEqual([bento().image!.src])
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
      <BlocksProvider onBlockEvent={onBlockEvent}>
        <Hero {...bento()} position={1} />
      </BlocksProvider>
    )

    await userEvent.click(screen.getByRole('link', { name: 'Talk to us' }))

    expect(onBlockEvent).toHaveBeenCalledWith({
      action: 'click',
      block: 'hero',
      preset: 'bento',
      position: 1,
      label: 'Talk to us',
      href: '/contact/sales'
    })
  })

  it.each([
    [undefined, 'HighFive'],
    ['Ticket', 'Ticket']
  ] as const)(
    'ends the bento title with the %s illustration as %s',
    (illustration, expected) => {
      const Expected = SPOT_ILLUSTRATIONS[expected]
      const { container: reference } = render(<Expected outline />)
      render(<Hero {...bento()} illustration={illustration} />)

      const title = screen.getByRole('heading', { level: 1 })
      expect(title.querySelector('svg')!.innerHTML).toBe(
        reference.querySelector('svg')!.innerHTML
      )
    }
  )

  describe('image', () => {
    it('sets the title as the h1 beside its one photo, loaded first', () => {
      const { container } = render(<Hero {...imageHero()} />)

      expect(
        screen.getByRole('heading', {
          level: 1,
          name: 'Sell more tickets with Lyrebird Radio'
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

    it('names the image preset', () => {
      render(<Hero {...imageHero()} />)

      const section = screen.getByRole('region')
      expect(section).toHaveAttribute('data-preset', 'image')
    })

    it('draws its photo with the provider’s renderImage', () => {
      render(
        <BlocksProvider
          renderImage={({ alt, priority }) => (
            <img alt={alt} data-priority={priority} src='/optimised.webp' />
          )}
        >
          <Hero {...imageHero()} />
        </BlocksProvider>
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

    it('names the title preset', () => {
      render(<Hero {...titleOnly} />)

      const section = screen.getByRole('region', { name: titleOnly.title })
      expect(section).toHaveAttribute('data-preset', 'title')
    })

    it('ignores media given to it', () => {
      const { container } = render(<Hero {...bento()} preset='title' />)

      expect(container.querySelector('img, video')).toBeNull()
    })
  })

  describe('partner', () => {
    it('opens the page with its title as the h1, beside both logos', () => {
      render(<Hero {...partnerHero()} />)

      const section = screen.getByRole('region', { name: 'Resell my tickets' })
      expect(section).toHaveAttribute('data-preset', 'partner')
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
      ).toHaveAttribute('src', '/photos/partner-logo.webp')
      expect(
        within(section).getByText(
          "The safest way to resell tickets to any event you can't make."
        )
      ).toBeInTheDocument()
    })

    it("names the partner's logo by the partner when the logo has no alt", () => {
      render(
        <Hero
          {...partnerHero()}
          partner={{ name: 'Partner', logo: { src: '/partner.svg', alt: '' } }}
        />
      )

      expect(screen.getByRole('img', { name: 'Partner' })).toHaveAttribute(
        'src',
        '/partner.svg'
      )
    })

    it('reports a click on its action', async () => {
      const onBlockEvent = vi.fn()
      render(
        <BlocksProvider onBlockEvent={onBlockEvent}>
          <Hero {...partnerHero()} position={1} />
        </BlocksProvider>
      )

      await userEvent.click(
        screen.getByRole('link', { name: /Resell my tickets/ })
      )

      expect(onBlockEvent).toHaveBeenCalledWith({
        action: 'click',
        block: 'hero',
        preset: 'partner',
        position: 1,
        label: expect.stringContaining('Resell my tickets'),
        href: 'https://resale.example.com'
      })
    })
  })

  it('falls back to bento with no preset', () => {
    render(<Hero {...bento()} preset={undefined} />)

    expect(screen.getByRole('region')).toHaveAttribute('data-preset', 'bento')
  })

  describe('intent', () => {
    it('keeps today’s look with none: brand-secondary marks, an accent action, a brand scrim', () => {
      const { container } = render(<Hero {...bento()} />)

      expect(screen.getByRole('region')).not.toHaveAttribute('data-intent')
      expect(container.querySelector('mark')).toHaveClass(
        'intent-brand-secondary'
      )
      expect(screen.getByRole('link', { name: 'Talk to us' })).toHaveClass(
        'intent-accent'
      )
      expect(container.querySelector('[data-slot=hero-scrim]')).toHaveClass(
        'bg-(--color-brand-light-13)/65'
      )
    })

    it.each(['bento', 'image', 'title', 'partner'] as const)(
      'sets the %s preset’s intent on its marks and strong action',
      (preset) => {
        const props =
          preset === 'bento'
            ? bento()
            : preset === 'image'
              ? imageHero()
              : preset === 'partner'
                ? { ...partnerHero(), highlight: 'Resell' }
                : { ...titleOnly, highlight: 'empower' }
        const { container } = render(
          <Hero {...props} actions={bento().actions} intent='success' />
        )

        expect(screen.getByRole('region')).toHaveAttribute(
          'data-intent',
          'success'
        )
        expect(container.querySelector('mark')).toHaveClass('intent-success')
        // Over the bento's dark scrim the strong action stays accent, so it stands out.
        expect(screen.getByRole('link', { name: 'Talk to us' })).toHaveClass(
          preset === 'bento' ? 'intent-accent' : 'intent-success'
        )
      }
    )

    it('tints the bento scrim with the intent’s fixed dark step', () => {
      const { container } = render(<Hero {...bento()} intent='danger' />)

      expect(container.querySelector('[data-slot=hero-scrim]')).toHaveClass(
        'bg-(--color-danger-light-13)/65'
      )
    })
  })
})
