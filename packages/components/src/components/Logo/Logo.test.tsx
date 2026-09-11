import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Logo } from '.'

function slots(root: Element) {
  return [...root.querySelectorAll('[data-slot]')].map((el) =>
    el.getAttribute('data-slot')
  )
}

describe('Logo', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the mark and the wordmark as separate SVGs by default', () => {
    render(<Logo />)
    const root = screen.getByRole('img', { name: 'Oztix' })

    expect(root).toHaveAttribute('data-slot', 'logo')
    expect(root).toHaveAttribute('data-variant', 'normal')
    expect(slots(root)).toEqual(['logo-mark', 'logo-wordmark'])

    const mark = root.querySelector('[data-slot=logo-mark]')!
    const wordmark = root.querySelector('[data-slot=logo-wordmark]')!
    expect(mark.tagName.toLowerCase()).toBe('svg')
    expect(wordmark.tagName.toLowerCase()).toBe('svg')
    expect(mark.contains(wordmark)).toBe(false)
    expect(mark).toHaveAttribute('viewBox', '0 0 48 48')
    expect(wordmark).toHaveAttribute('viewBox', '0 0 128 42')
  })

  it('renders only the mark for logomark', () => {
    render(<Logo variant='logomark' />)
    const root = screen.getByRole('img', { name: 'Oztix' })
    expect(slots(root)).toEqual(['logo-mark'])
    expect(root.querySelectorAll('path')).toHaveLength(1)
  })

  it('renders only the wordmark for wordmark', () => {
    render(<Logo variant='wordmark' />)
    const root = screen.getByRole('img', { name: 'Oztix' })
    expect(slots(root)).toEqual(['logo-wordmark'])
    expect(root.querySelectorAll('path')).toHaveLength(1)
  })

  it('renders the mark and the product name as live text for product', () => {
    render(<Logo variant='product'>Studio</Logo>)
    const root = screen.getByRole('img', { name: 'Oztix Studio' })
    expect(slots(root)).toEqual(['logo-mark', 'logo-product'])

    const product = root.querySelector('[data-slot=logo-product]')!
    expect(product.tagName.toLowerCase()).toBe('span')
    expect(product).toHaveTextContent('Studio')
  })

  it('ignores children outside the product variant', () => {
    render(<Logo>Studio</Logo>)
    const root = screen.getByRole('img', { name: 'Oztix' })
    expect(root).not.toHaveTextContent('Studio')
  })

  it('fills every SVG with currentColor and hides it from assistive tech', () => {
    const { container } = render(<Logo />)
    const svgs = container.querySelectorAll('svg')
    expect(svgs).toHaveLength(2)
    for (const svg of svgs) {
      expect(svg).toHaveAttribute('fill', 'currentColor')
      expect(svg).toHaveAttribute('aria-hidden', 'true')
    }
  })

  it('names a product logo "Oztix" when its children are not a string', () => {
    render(
      <Logo variant='product'>
        <em>Studio</em>
      </Logo>
    )
    expect(screen.getByRole('img', { name: 'Oztix' })).toBeInTheDocument()
  })

  it('lets the consumer override the accessible name', () => {
    render(
      <Logo variant='product' aria-label='Oztix Studio home'>
        Studio
      </Logo>
    )
    expect(
      screen.getByRole('img', { name: 'Oztix Studio home' })
    ).toBeInTheDocument()
  })

  it('drops its role and name when aria-hidden', () => {
    const { container } = render(<Logo aria-hidden />)
    const root = container.querySelector('[data-slot=logo]')!
    expect(root).toHaveAttribute('aria-hidden', 'true')
    expect(root).not.toHaveAttribute('role')
    expect(root).not.toHaveAttribute('aria-label')
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('warns once in development when a product logo has no name', async () => {
    vi.resetModules()
    const { Logo: FreshLogo } = await import('.')
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(<FreshLogo variant='product' />)
    render(<FreshLogo variant='product' />)
    expect(warn).toHaveBeenCalledOnce()
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("variant='product'")
    )
  })

  describe('colour', () => {
    it('defaults to the brand intent with a semantic text colour', () => {
      render(<Logo />)
      const root = screen.getByRole('img')
      expect(root).toHaveClass('intent-brand', 'text-subtler')
    })

    // An intent class swaps the palette; a text-* class replaces text-subtler.
    it('takes a different intent from className', () => {
      render(<Logo className='intent-neutral' />)
      const root = screen.getByRole('img')
      expect(root).toHaveClass('intent-neutral', 'text-subtler')
      expect(root).not.toHaveClass('intent-brand')
    })

    it('takes a different text colour from className', () => {
      render(<Logo className='text-inverted' />)
      const root = screen.getByRole('img')
      expect(root).toHaveClass('intent-brand', 'text-inverted')
      expect(root).not.toHaveClass('text-subtler')
    })
  })

  it('merges className and passes other props through', () => {
    render(<Logo className='shrink text-[3rem]' id='site-logo' />)
    const root = screen.getByRole('img')
    expect(root).toHaveClass('text-[3rem]', 'shrink', 'inline-flex')
    expect(root).not.toHaveClass('text-[2rem]', 'shrink-0')
    expect(root).toHaveAttribute('id', 'site-logo')
  })

  it('keeps leading-none on the product name after a resize', () => {
    render(
      <Logo variant='product' className='text-[3rem]'>
        Studio
      </Logo>
    )
    const product = screen.getByText('Studio')
    expect(product).toHaveClass('leading-none')
  })

  it('warns when product children are not a plain string, e.g. array children', async () => {
    vi.resetModules()
    const { Logo: FreshLogo } = await import('.')
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(<FreshLogo variant='product'>{'Studio'} beta</FreshLogo>)
    expect(warn).toHaveBeenCalledOnce()
  })

  it('warns when the product name is whitespace only', async () => {
    vi.resetModules()
    const { Logo: FreshLogo } = await import('.')
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(<FreshLogo variant='product'>{'   '}</FreshLogo>)
    expect(warn).toHaveBeenCalledOnce()
  })

  it('stays silent in production', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.resetModules()
    const { Logo: FreshLogo } = await import('.')
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(<FreshLogo variant='product' />)
    expect(warn).not.toHaveBeenCalled()
    vi.unstubAllEnvs()
  })

  it('keeps role=img and the accessible name when aria-hidden is the string "false"', () => {
    render(<Logo aria-hidden='false' />)
    expect(screen.getByRole('img', { name: 'Oztix' })).toBeInTheDocument()
  })

  it('drops role and name when aria-hidden is the string "true"', () => {
    const { container } = render(<Logo aria-hidden='true' />)
    const root = container.querySelector('[data-slot=logo]')!
    expect(root).toHaveAttribute('aria-hidden', 'true')
    expect(root).not.toHaveAttribute('role')
    expect(root).not.toHaveAttribute('aria-label')
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })
})
