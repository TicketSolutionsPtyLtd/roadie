import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Testimonial } from '.'
import { MarketingBlocksProvider } from '../Provider'
import { quote } from './fixtures'

describe('Testimonial', () => {
  it('renders quote as a section named by its heading', () => {
    render(<Testimonial {...quote} position={4} />)

    const section = screen.getByRole('region', {
      name: 'Our partners say it best'
    })
    expect(section).toHaveAttribute('data-block', 'testimonial')
    expect(section).toHaveAttribute('data-variant', 'one')
    expect(section).toHaveAttribute('data-preset', 'quote')
    expect(section).toHaveAttribute('data-position', '4')
    expect(
      screen.getByText('Why venues and event organisers partner with Oztix')
    ).toBeInTheDocument()
  })

  it('ties the quote to its citation in one figure', () => {
    render(<Testimonial {...quote} />)

    const figure = screen.getByRole('figure')
    const blockquote = within(figure).getByRole('blockquote')
    expect(blockquote).toHaveTextContent(quote.quote)
    const caption = figure.querySelector('figcaption')!
    expect(caption).toHaveTextContent('Mia Tran')
    expect(caption).toHaveTextContent('Head of Programming')
    expect(
      within(caption).getByRole('img', { name: 'Portrait of Mia Tran' })
    ).toBeInTheDocument()
    expect(
      within(caption).getByRole('img', { name: 'Thimble Orbit Presents logo' })
    ).toBeInTheDocument()
  })

  it('reads the organisation from its logo, with no name as text', () => {
    render(
      <Testimonial
        {...quote}
        organisation={{
          name: 'Thimble Orbit Presents',
          logo: { ...quote.organisation.logo, alt: '' }
        }}
      />
    )

    const caption = screen.getByRole('figure').querySelector('figcaption')!
    expect(
      within(caption).getByRole('img', { name: 'Thimble Orbit Presents' })
    ).toBeInTheDocument()
    expect(within(caption).queryByText('Thimble Orbit Presents')).toBeNull()
  })

  it('names the organisation in text when it has no logo', () => {
    render(
      <Testimonial
        {...quote}
        person={{ name: 'Mia Tran', role: 'Head of Programming' }}
        organisation={{ name: 'Thimble Orbit Presents' }}
      />
    )

    const caption = screen.getByRole('figure').querySelector('figcaption')!
    expect(within(caption).queryByRole('img')).toBeNull()
    expect(caption).toHaveTextContent('Thimble Orbit Presents')
  })

  it('draws the background photo behind, unread, only when given', () => {
    const { container, rerender } = render(<Testimonial {...quote} />)
    const background = container.querySelector(
      `img[src="${quote.backgroundImage.src}"]`
    )
    expect(background).toHaveAttribute('alt', '')

    rerender(<Testimonial {...quote} backgroundImage={undefined} />)
    expect(
      container.querySelector(`img[src="${quote.backgroundImage.src}"]`)
    ).toBeNull()
  })

  it("draws every image with the provider's renderImage", () => {
    render(
      <MarketingBlocksProvider
        renderImage={({ alt }) => <img alt={alt} src='/optimised.webp' />}
      >
        <Testimonial {...quote} />
      </MarketingBlocksProvider>
    )

    const images = document.querySelectorAll('img')
    expect(images).toHaveLength(3)
    for (const img of images)
      expect(img).toHaveAttribute('src', '/optimised.webp')
  })

  it('gives every image the sizes its layout needs', () => {
    const renderImage = vi.fn(({ alt }: { alt: string }) => (
      <img alt={alt} src='/optimised.webp' />
    ))
    render(
      <MarketingBlocksProvider renderImage={renderImage}>
        <Testimonial {...quote} />
      </MarketingBlocksProvider>
    )

    for (const [image] of renderImage.mock.calls)
      expect(image, image.alt).toHaveProperty('sizes', expect.any(String))
  })

  it('reports no click from the quote, which holds no links', async () => {
    const onBlockEvent = vi.fn()
    render(
      <MarketingBlocksProvider onBlockEvent={onBlockEvent}>
        <Testimonial {...quote} />
      </MarketingBlocksProvider>
    )

    await userEvent.click(screen.getByRole('blockquote'))

    expect(onBlockEvent).not.toHaveBeenCalled()
  })
})
