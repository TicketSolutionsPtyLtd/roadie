import { render, screen } from '@testing-library/react'
import { describe, expect, expectTypeOf, it } from 'vitest'

import {
  Logo,
  type LogoDirection,
  type LogoProps,
  type LogoSize,
  type LogoTone,
  type LogoVariant
} from '.'
import * as barrel from '../../index'
import type {
  LogoDirection as BarrelLogoDirection,
  LogoProps as BarrelLogoProps,
  LogoSize as BarrelLogoSize,
  LogoTone as BarrelLogoTone,
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

    it('renders the product lockup for variant=product', () => {
      render(<Logo variant='product' product='Studio' />)
      const root = screen.getByRole('img', { name: 'Oztix Studio' })
      expect(root).toHaveAttribute('data-variant', 'product')
      expect(slots(root)).toEqual(['logo-mark', 'logo-product'])
    })

    it.each(['normal', 'mark', 'wordmark', 'tagline'] as const)(
      'still wins over variant=%s from an untyped caller',
      (variant) => {
        const props = { variant, product: 'Studio' } as unknown as LogoProps
        render(<Logo {...props} />)
        const root = screen.getByRole('img', { name: 'Oztix Studio' })
        expect(slots(root)).toEqual(['logo-mark', 'logo-product'])
      }
    )

    it.each([
      ['blank', ''],
      ['whitespace', '   '],
      ['undefined', undefined]
    ])('is ignored when %s', (_, product) => {
      render(<Logo product={product} />)
      const root = screen.getByRole('img', { name: 'Oztix' })
      expect(slots(root)).toEqual(['logo-mark', 'logo-wordmark'])
    })

    it('keeps leading-none on the name after a resize', () => {
      render(<Logo product='Studio' className='text-[3rem]' />)
      expect(screen.getByText('Studio')).toHaveClass('leading-none')
    })
  })

  describe('tagline', () => {
    it('adds the tagline after the wordmark and to the accessible name', () => {
      render(<Logo variant='tagline' />)
      const root = screen.getByRole('img', {
        name: 'Oztix, Built on Partnerships'
      })
      expect(slots(root)).toEqual([
        'logo-mark',
        'logo-wordmark',
        'logo-tagline',
        'logo-divider'
      ])
    })

    it('keeps the tagline in the vertical lockup', () => {
      render(<Logo variant='tagline' direction='vertical' />)
      const root = screen.getByRole('img', {
        name: 'Oztix, Built on Partnerships'
      })
      expect(slots(root)).toEqual([
        'logo-mark',
        'logo-wordmark',
        'logo-tagline'
      ])
    })

    it('still takes a consumer accessible name', () => {
      render(<Logo variant='tagline' aria-label='Oztix home' />)
      expect(
        screen.getByRole('img', { name: 'Oztix home' })
      ).toBeInTheDocument()
    })
  })

  describe('direction', () => {
    it('sets the mark above the wordmark as separate SVGs', () => {
      render(<Logo direction='vertical' />)
      const root = screen.getByRole('img', { name: 'Oztix' })
      expect(slots(root)).toEqual(['logo-mark', 'logo-wordmark'])
    })
  })

  describe('types', () => {
    it('accepts each lockup with the props it takes', () => {
      expectTypeOf<{ product: 'Studio' }>().toExtend<LogoProps>()
      expectTypeOf<{ product: string | undefined }>().toExtend<LogoProps>()
      expectTypeOf<{
        variant: 'product'
        product: 'Studio'
        tone: 'neutral'
        size: 'lg'
      }>().toExtend<LogoProps>()
      expectTypeOf<{
        variant: 'tagline'
        direction: 'vertical'
      }>().toExtend<LogoProps>()
      expectTypeOf<{ variant: 'mark'; tone: 'light' }>().toExtend<LogoProps>()
    })

    it('rejects a product variant with no product name', () => {
      expectTypeOf<{ variant: 'product' }>().not.toExtend<LogoProps>()
    })

    it('rejects a product name with any other variant', () => {
      expectTypeOf<{
        variant: 'normal'
        product: 'Studio'
      }>().not.toExtend<LogoProps>()
      expectTypeOf<{
        variant: 'mark'
        product: 'Studio'
      }>().not.toExtend<LogoProps>()
      expectTypeOf<{
        variant: 'wordmark'
        product: 'Studio'
      }>().not.toExtend<LogoProps>()
      expectTypeOf<{
        variant: 'tagline'
        product: 'Studio'
      }>().not.toExtend<LogoProps>()
    })

    it('rejects direction on mark, wordmark, and product', () => {
      expectTypeOf<{
        variant: 'mark'
        direction: 'vertical'
      }>().not.toExtend<LogoProps>()
      expectTypeOf<{
        variant: 'wordmark'
        direction: 'horizontal'
      }>().not.toExtend<LogoProps>()
      expectTypeOf<{
        product: 'Studio'
        direction: 'vertical'
      }>().not.toExtend<LogoProps>()
      expectTypeOf<{
        variant: 'product'
        product: 'Studio'
        direction: 'vertical'
      }>().not.toExtend<LogoProps>()
    })

    it('rejects the invalid combinations in JSX', () => {
      const invalid = [
        // @ts-expect-error variant='product' needs a product name
        <Logo key='a' variant='product' />,
        // @ts-expect-error only the product lockup takes a product name
        <Logo key='b' variant='mark' product='Studio' />,
        // @ts-expect-error only normal and tagline take a direction
        <Logo key='c' variant='wordmark' direction='vertical' />,
        // @ts-expect-error a product logo takes no direction
        <Logo key='d' product='Studio' direction='vertical' />,
        // @ts-expect-error the tagline is a variant, not a boolean prop
        <Logo key='e' tagline />
      ]
      expect(invalid).toHaveLength(5)
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
    it('holds the neutral tone to the neutral intent', () => {
      render(
        <div className='intent-danger'>
          <Logo tone='neutral' />
        </div>
      )
      expect(screen.getByRole('img')).toHaveClass('intent-neutral')
    })

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

  describe('direction', () => {
    it('stays left to right inside a right-to-left page', () => {
      render(
        <div dir='rtl'>
          <Logo />
        </div>
      )
      expect(screen.getByRole('img')).toHaveAttribute('dir', 'ltr')
    })

    it('keeps the product lockup left to right too', () => {
      render(
        <div dir='rtl'>
          <Logo product='Studio' />
        </div>
      )
      expect(screen.getByRole('img', { name: 'Oztix Studio' })).toHaveAttribute(
        'dir',
        'ltr'
      )
    })

    it('ignores a dir passed at runtime', () => {
      const props = { dir: 'rtl' } as LogoProps
      render(<Logo {...props} />)
      expect(screen.getByRole('img')).toHaveAttribute('dir', 'ltr')
    })

    it('takes no dir prop', () => {
      expectTypeOf<LogoProps>().not.toHaveProperty('dir')
    })
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
    expectTypeOf<BarrelLogoDirection>().toEqualTypeOf<LogoDirection>()
    expectTypeOf<BarrelLogoTone>().toEqualTypeOf<LogoTone>()
    expectTypeOf<LogoVariant>().toEqualTypeOf<
      'normal' | 'mark' | 'wordmark' | 'tagline' | 'product'
    >()
    expectTypeOf<LogoDirection>().toEqualTypeOf<'horizontal' | 'vertical'>()
    expectTypeOf<LogoTone>().toEqualTypeOf<
      'brand' | 'dark' | 'light' | 'neutral'
    >()
    expectTypeOf<LogoProps>().not.toHaveProperty('children')
  })
})
