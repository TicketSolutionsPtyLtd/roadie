import { render, screen } from '@testing-library/react'
import { describe, expect, expectTypeOf, it } from 'vitest'

import { Logo, type LogoProps, type LogoSize, type LogoVariant } from '.'
import * as barrel from '../../index'
import type {
  LogoProps as BarrelLogoProps,
  LogoSize as BarrelLogoSize,
  LogoVariant as BarrelLogoVariant
} from '../../index'

function slots(root: Element) {
  return [...root.querySelectorAll('[data-slot]')].map((el) =>
    el.getAttribute('data-slot')
  )
}

describe('Logo', () => {
  it('renders the mark and the wordmark as separate SVGs by default', () => {
    render(<Logo />)
    const root = screen.getByRole('img', { name: 'Oztix' })

    expect(root).toHaveAttribute('data-slot', 'logo')
    expect(root).toHaveAttribute('data-variant', 'normal')
    expect(slots(root)).toEqual(['logo-mark', 'logo-wordmark'])

    const mark = root.querySelector('[data-slot=logo-mark]')!
    const wordmark = root.querySelector('[data-slot=logo-wordmark] svg')!
    expect(mark.tagName.toLowerCase()).toBe('svg')
    expect(mark.contains(wordmark)).toBe(false)
    expect(mark).toHaveAttribute('viewBox', '0 0 48 48')
    expect(wordmark).toHaveAttribute('viewBox', '0 0 128 42')
  })

  describe('collapsible part', () => {
    it.each([
      ['logo-wordmark', <Logo key='normal' />],
      ['logo-product', <Logo key='product' product='Studio' />]
    ])(
      'gives %s its own leading gap and a clipped 1fr column',
      (slot, logo) => {
        render(logo)
        const root = screen.getByRole('img')
        const part = root.querySelector(`[data-slot=${slot}]`)!

        expect(root).not.toHaveClass('gap-[calc(1em/6)]')
        expect(part.parentElement).toBe(root)
        expect(part).toHaveClass(
          'grid',
          'grid-cols-[1fr]',
          'min-w-0',
          'overflow-hidden'
        )
        expect(part.firstElementChild).toHaveClass(
          'min-w-0',
          'before:w-[calc(1em/6)]'
        )
      }
    )

    it('keeps the mark outside the collapsible part', () => {
      render(<Logo />)
      const root = screen.getByRole('img')
      const mark = root.querySelector('[data-slot=logo-mark]')!
      expect(mark.parentElement).toBe(root)
      expect(mark).toHaveClass('size-[1em]', 'shrink-0')
    })

    it('has no gap or wrapper when the wordmark stands alone', () => {
      render(<Logo variant='wordmark' />)
      const root = screen.getByRole('img')
      const wordmark = root.querySelector('[data-slot=logo-wordmark]')!
      expect(wordmark.tagName.toLowerCase()).toBe('svg')
      expect(wordmark.parentElement).toBe(root)
    })
  })

  it('renders only the mark for mark', () => {
    render(<Logo variant='mark' />)
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

  describe('product', () => {
    it('renders the mark and the product name as live text', () => {
      render(<Logo product='Studio' />)
      const root = screen.getByRole('img', { name: 'Oztix Studio' })
      expect(slots(root)).toEqual(['logo-mark', 'logo-product'])

      const product = root.querySelector('[data-slot=logo-product]')!
      expect(product.tagName.toLowerCase()).toBe('span')
      expect(product).toHaveTextContent('Studio')
    })

    it.each(['normal', 'mark', 'wordmark'] as const)(
      'takes precedence over variant=%s',
      (variant) => {
        render(<Logo variant={variant} product='Studio' />)
        const root = screen.getByRole('img', { name: 'Oztix Studio' })
        expect(slots(root)).toEqual(['logo-mark', 'logo-product'])
      }
    )

    it.each(['', '   '])('is ignored when blank (%j)', (product) => {
      render(<Logo product={product} />)
      const root = screen.getByRole('img', { name: 'Oztix' })
      expect(slots(root)).toEqual(['logo-mark', 'logo-wordmark'])
    })

    it('keeps leading-none on the name after a resize', () => {
      render(<Logo product='Studio' className='text-[3rem]' />)
      expect(screen.getByText('Studio')).toHaveClass('leading-none')
    })
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

  it('lets the consumer override the accessible name', () => {
    render(<Logo product='Studio' aria-label='Oztix Studio home' />)
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

  describe('colour', () => {
    it('is brand-9, fixed regardless of a surrounding intent or dark mode', () => {
      render(
        <div className='dark intent-danger'>
          <Logo />
        </div>
      )
      const root = screen.getByRole('img')
      expect(root).toHaveClass('text-brand-9')
      expect(root).not.toHaveClass('intent-danger')
    })
  })

  describe('size', () => {
    it.each([
      ['xs', 'text-[20px]'],
      ['sm', 'text-[24px]'],
      ['md', 'text-[32px]'],
      ['lg', 'text-[40px]'],
      ['xl', 'text-[48px]']
    ] as const)('maps size=%s to %s', (size, expectedClass) => {
      render(<Logo size={size} />)
      expect(screen.getByRole('img')).toHaveClass(expectedClass)
    })

    it('defaults to md', () => {
      render(<Logo />)
      expect(screen.getByRole('img')).toHaveClass('text-[32px]')
    })
  })

  it('merges className and passes other props through', () => {
    render(<Logo className='shrink text-[3rem]' id='site-logo' />)
    const root = screen.getByRole('img')
    expect(root).toHaveClass('text-[3rem]', 'shrink', 'inline-flex')
    expect(root).not.toHaveClass('text-[32px]', 'shrink-0')
    expect(root).toHaveAttribute('id', 'site-logo')
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

  it('exports the component and its types from the subpath and the barrel', () => {
    expect(barrel.Logo).toBe(Logo)
    expectTypeOf<BarrelLogoProps>().toEqualTypeOf<LogoProps>()
    expectTypeOf<BarrelLogoVariant>().toEqualTypeOf<LogoVariant>()
    expectTypeOf<BarrelLogoSize>().toEqualTypeOf<LogoSize>()
    expectTypeOf<LogoVariant>().toEqualTypeOf<'normal' | 'mark' | 'wordmark'>()
    expectTypeOf<LogoProps>().not.toHaveProperty('children')
  })
})
