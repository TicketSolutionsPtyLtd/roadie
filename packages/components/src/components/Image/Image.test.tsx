import { createRef } from 'react'

import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Image } from '.'

const OZTIX =
  'https://assets.oztix.com.au/image/1226ab55-3d53-47f0-ab4c-cddcf02bb001.png'
const EXTERNAL = 'https://images.example.com/abc.png'

describe('Image', () => {
  it('passes through as a plain <img> when no width is given', () => {
    const { container } = render(<Image src={OZTIX} alt='Logo' />)
    const img = container.querySelector('img')!
    expect(img).toHaveAttribute('src', OZTIX)
    expect(img).not.toHaveAttribute('srcset')
    expect(img).toHaveAttribute('alt', 'Logo')
  })

  it('rewrites the src and emits a 1x/2x srcSet when width is set', () => {
    const { container } = render(<Image src={OZTIX} alt='Logo' width={600} />)
    const img = container.querySelector('img')!
    expect(img.getAttribute('src')).toContain('width=600')
    expect(img.getAttribute('src')).toContain('format=webp')
    const srcset = img.getAttribute('srcset')!
    expect(srcset).toContain('width=600')
    expect(srcset).toContain('600w')
    expect(srcset).toContain('width=1200')
    expect(srcset).toContain('1200w')
    expect(img).toHaveAttribute('sizes', '600px')
  })

  it('honours an explicit widths ladder and sizes', () => {
    const { container } = render(
      <Image
        src={OZTIX}
        alt='Hero'
        width={1200}
        widths={[768, 1200, 2400]}
        sizes='100vw'
      />
    )
    const srcset = container.querySelector('img')!.getAttribute('srcset')!
    expect(srcset).toContain('768w')
    expect(srcset).toContain('2400w')
    expect(container.querySelector('img')).toHaveAttribute('sizes', '100vw')
  })

  it('honours an explicit format', () => {
    const { container } = render(
      <Image src={OZTIX} alt='Logo' width={600} format='jpg' />
    )
    expect(container.querySelector('img')!.getAttribute('src')).toContain(
      'format=jpg'
    )
  })

  it('appends autotrim=1 to src and srcSet when autotrim is set', () => {
    const { container } = render(
      <Image src={OZTIX} alt='Logo' width={600} autotrim />
    )
    const img = container.querySelector('img')!
    expect(img.getAttribute('src')).toContain('autotrim=1')
    expect(img.getAttribute('srcset')).toContain('autotrim=1')
  })

  it('forwards quality and arbitrary params to the rewritten src', () => {
    const { container } = render(
      <Image
        src={OZTIX}
        alt='Logo'
        width={600}
        quality={70}
        params={{ rmode: 'crop', height: 300 }}
      />
    )
    const src = container.querySelector('img')!.getAttribute('src')!
    expect(src).toContain('quality=70')
    expect(src).toContain('rmode=crop')
    expect(src).toContain('height=300')
  })

  it('leaves non-Oztix URLs unrewritten even with a width', () => {
    const { container } = render(
      <Image src={EXTERNAL} alt='External' width={600} />
    )
    const img = container.querySelector('img')!
    expect(img).toHaveAttribute('src', EXTERNAL)
    expect(img).not.toHaveAttribute('srcset')
  })

  it('reserves layout with width, height and aspect-ratio', () => {
    const { container } = render(
      <Image src={OZTIX} alt='Logo' width={600} height={300} />
    )
    const img = container.querySelector('img')!
    expect(img).toHaveAttribute('width', '600')
    expect(img).toHaveAttribute('height', '300')
    expect(img.style.aspectRatio).toBe('600 / 300')
  })

  it('sends height to the proxy and scales it proportionally in srcSet', () => {
    const { container } = render(
      <Image src={OZTIX} alt='Logo' width={600} height={300} />
    )
    const img = container.querySelector('img')!
    expect(img.getAttribute('src')).toContain('height=300')
    const srcset = img.getAttribute('srcset')!
    expect(srcset).toContain('width=600')
    expect(srcset).toContain('height=300')
    expect(srcset).toContain('width=1200')
    expect(srcset).toContain('height=600')
  })

  it('treats a non-positive width as no width (plain pass-through)', () => {
    const { container } = render(<Image src={OZTIX} alt='Logo' width={0} />)
    const img = container.querySelector('img')!
    expect(img).toHaveAttribute('src', OZTIX)
    expect(img).not.toHaveAttribute('srcset')
    expect(img.style.aspectRatio).toBe('')
  })

  it('lazy-loads by default', () => {
    const { container } = render(<Image src={OZTIX} alt='Logo' width={600} />)
    expect(container.querySelector('img')).toHaveAttribute('loading', 'lazy')
  })

  it('eager-loads and prioritises when priority is set', () => {
    const { container } = render(
      <Image src={OZTIX} alt='Logo' width={600} priority />
    )
    const img = container.querySelector('img')!
    expect(img).toHaveAttribute('loading', 'eager')
    expect(img).toHaveAttribute('fetchpriority', 'high')
  })

  it('lets an explicit loading override win', () => {
    const { container } = render(
      <Image src={OZTIX} alt='Logo' width={600} loading='eager' />
    )
    expect(container.querySelector('img')).toHaveAttribute('loading', 'eager')
  })

  it('forwards arbitrary img attributes and className', () => {
    const { container } = render(
      <Image src={OZTIX} alt='Logo' width={600} className='rounded-xl' id='x' />
    )
    const img = container.querySelector('img')!
    expect(img).toHaveClass('rounded-xl')
    expect(img).toHaveAttribute('id', 'x')
  })

  it('exposes the underlying img via ref', () => {
    const ref = createRef<HTMLImageElement>()
    render(<Image ref={ref} src={OZTIX} alt='Logo' width={600} />)
    expect(ref.current).toBeInstanceOf(HTMLImageElement)
  })

  it('shows a subtle tint as a placeholder, then drops it once loaded', () => {
    const { container } = render(<Image src={OZTIX} alt='Logo' width={600} />)
    const img = container.querySelector('img')!
    expect(img).toHaveClass('bg-subtle')
    act(() => {
      img.dispatchEvent(new Event('load'))
    })
    expect(container.querySelector('img')).not.toHaveClass('bg-subtle')
  })

  it('lets a semantic background class override the tint', () => {
    const { container } = render(
      <Image src={OZTIX} alt='Logo' width={600} className='bg-sunken' />
    )
    const img = container.querySelector('img')!
    expect(img).toHaveClass('bg-sunken')
    expect(img).not.toHaveClass('bg-subtle')
  })

  describe('placeholder=blur', () => {
    it('wraps the image and shows a blurred LQIP that fades out on load', () => {
      const { container } = render(
        <Image
          src={OZTIX}
          alt='Logo'
          width={600}
          height={300}
          placeholder='blur'
        />
      )
      const wrapper = container.querySelector('[data-slot="image-blur"]')!
      expect(wrapper).toBeInTheDocument()
      expect(wrapper).toHaveClass('bg-subtle')
      const lqip = wrapper.querySelector('[aria-hidden="true"]') as HTMLElement
      expect(lqip.style.backgroundImage).toContain(`width=${24}`)
      expect(lqip.style.filter).toContain('blur')

      const img = wrapper.querySelector('img')!
      expect(img.style.opacity).toBe('0')
      act(() => {
        img.dispatchEvent(new Event('load'))
      })
      expect(wrapper.querySelector('img')!.style.opacity).toBe('1')
    })

    it('stays a bare <img> when placeholder is empty', () => {
      const { container } = render(
        <Image src={OZTIX} alt='Logo' width={600} placeholder='empty' />
      )
      expect(
        container.querySelector('[data-slot="image-blur"]')
      ).not.toBeInTheDocument()
      expect(container.querySelector('img')).toBeInTheDocument()
    })

    it('uses blurDataURL for non-Oztix images', () => {
      const { container } = render(
        <Image
          src={EXTERNAL}
          alt='External'
          width={600}
          placeholder='blur'
          blurDataURL='data:image/png;base64,abc'
        />
      )
      const lqip = container.querySelector(
        '[aria-hidden="true"]'
      ) as HTMLElement
      expect(lqip.style.backgroundImage).toContain('data:image/png;base64,abc')
    })

    it('falls back to a bare <img> for non-Oztix images with no blurDataURL', () => {
      const { container } = render(
        <Image src={EXTERNAL} alt='External' width={600} placeholder='blur' />
      )
      expect(
        container.querySelector('[data-slot="image-blur"]')
      ).not.toBeInTheDocument()
    })
  })

  describe('defer', () => {
    let callback: (
      entries: IntersectionObserverEntry[],
      observer: IntersectionObserver
    ) => void
    let observe: ReturnType<typeof vi.fn>
    let disconnect: ReturnType<typeof vi.fn>

    beforeEach(() => {
      observe = vi.fn()
      disconnect = vi.fn()
      vi.stubGlobal(
        'IntersectionObserver',
        class {
          constructor(
            cb: (
              entries: IntersectionObserverEntry[],
              observer: IntersectionObserver
            ) => void
          ) {
            callback = cb
          }
          observe = observe
          disconnect = disconnect
          unobserve = vi.fn()
          takeRecords = vi.fn()
        }
      )
    })

    afterEach(() => {
      vi.unstubAllGlobals()
    })

    it('withholds src until the image intersects the viewport', () => {
      const { container } = render(
        <Image src={OZTIX} alt='Logo' width={600} defer />
      )
      const img = container.querySelector('img')!
      expect(img).not.toHaveAttribute('src')
      expect(img).toHaveAttribute('width', '600')
      expect(observe).toHaveBeenCalled()

      act(() => {
        callback(
          [{ isIntersecting: true } as IntersectionObserverEntry],
          {} as IntersectionObserver
        )
      })

      expect(container.querySelector('img')!.getAttribute('src')).toContain(
        'width=600'
      )
      expect(disconnect).toHaveBeenCalled()
    })

    it('loads immediately when defer flips off before intersection', () => {
      const { container, rerender } = render(
        <Image src={OZTIX} alt='Logo' width={600} defer />
      )
      expect(container.querySelector('img')).not.toHaveAttribute('src')

      rerender(<Image src={OZTIX} alt='Logo' width={600} defer={false} />)
      expect(container.querySelector('img')!.getAttribute('src')).toContain(
        'width=600'
      )
    })

    it('ignores defer when priority is set', () => {
      const { container } = render(
        <Image src={OZTIX} alt='Logo' width={600} defer priority />
      )
      expect(container.querySelector('img')!.getAttribute('src')).toContain(
        'width=600'
      )
      expect(observe).not.toHaveBeenCalled()
    })
  })
})
