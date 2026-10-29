import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { Media } from '.'
import { MarketingBlocksProvider } from '../Provider'

const images = [
  { src: '/brand/photography/01.webp', alt: 'Fans at the front barrier' },
  { src: '/brand/photography/02.webp', alt: 'A drummer under stage lights' },
  { src: '/brand/photography/03.webp', alt: 'A festival crowd at dusk' }
]

describe('Media', () => {
  it('renders the gallery heading and each photo with its alt text', () => {
    render(
      <Media
        preset='gallery'
        position={4}
        title='Join thousands of partners who trust Oztix'
        description='From festivals to local venues.'
        images={images}
      />
    )

    const section = screen.getByRole('region', {
      name: 'Join thousands of partners who trust Oztix'
    })
    expect(section).toHaveAttribute('data-block', 'media')
    expect(section).toHaveAttribute('data-variant', 'image')
    expect(section).toHaveAttribute('data-preset', 'gallery')
    expect(section).toHaveAttribute('data-position', '4')
    expect(
      screen.getByText('From festivals to local venues.')
    ).toBeInTheDocument()
    expect(
      screen.getAllByRole('img').map((img) => img.getAttribute('alt'))
    ).toEqual(images.map(({ alt }) => alt))
  })

  it('draws its photos with the provider’s renderImage', () => {
    render(
      <MarketingBlocksProvider
        renderImage={({ alt, sizes }) => (
          <img alt={alt} data-sizes={sizes} src='/optimised.webp' />
        )}
      >
        <Media title='Our people' images={images.slice(0, 1)} />
      </MarketingBlocksProvider>
    )

    const img = screen.getByRole('img', { name: 'Fans at the front barrier' })
    expect(img).toHaveAttribute('src', '/optimised.webp')
    expect(img.getAttribute('data-sizes')).toMatch(/px/)
  })

  it('shows the same photo twice when it’s listed twice', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const repeated = [images[0]!, images[0]!]
    const { rerender } = render(<Media title='Our people' images={repeated} />)
    rerender(<Media title='Our people' images={[...repeated, images[1]!]} />)

    expect(
      screen.getAllByRole('img', { name: 'Fans at the front barrier' })
    ).toHaveLength(2)
    expect(error).not.toHaveBeenCalled()
    error.mockRestore()
  })
})
