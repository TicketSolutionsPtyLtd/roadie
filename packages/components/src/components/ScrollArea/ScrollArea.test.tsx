import type { CSSProperties } from 'react'

import { act, render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ScrollArea } from '.'

// Base UI's Viewport measures overflow via a `queueMicrotask` scheduled from
// a layout effect, which resolves after `render()` returns and updates
// ScrollAreaRoot state outside of React's act() scope. Flushing that
// microtask inside `act` keeps every mounting test's output warning-free.
async function flushViewportMeasurement() {
  await act(async () => {
    await Promise.resolve()
  })
}

const tree = (
  <ScrollArea>
    <ScrollArea.Viewport>
      <p>Scrollable content</p>
    </ScrollArea.Viewport>
    <ScrollArea.Scrollbar keepMounted>
      <ScrollArea.Thumb />
    </ScrollArea.Scrollbar>
  </ScrollArea>
)

describe('ScrollArea', () => {
  it('renders the root, viewport, scrollbar and thumb slots', async () => {
    const { container } = render(tree)
    await flushViewportMeasurement()

    expect(container.querySelector('[data-slot="scroll-area"]')).toBeTruthy()
    expect(
      container.querySelector('[data-slot="scroll-area-viewport"]')
    ).toBeTruthy()
    expect(
      container.querySelector('[data-slot="scroll-area-scrollbar"]')
    ).toBeTruthy()
    expect(
      container.querySelector('[data-slot="scroll-area-thumb"]')
    ).toBeTruthy()
  })

  it('renders children inside the viewport', async () => {
    const { container, getByText } = render(tree)
    await flushViewportMeasurement()
    const viewport = container.querySelector(
      '[data-slot="scroll-area-viewport"]'
    )!

    expect(viewport).toContainElement(getByText('Scrollable content'))
  })

  it('defaults the scrollbar to the vertical orientation', async () => {
    const { container } = render(tree)
    await flushViewportMeasurement()

    expect(
      container.querySelector('[data-slot="scroll-area-scrollbar"]')
    ).toHaveAttribute('data-orientation', 'vertical')
  })

  it('renders a horizontal scrollbar when asked', async () => {
    const { container } = render(
      <ScrollArea>
        <ScrollArea.Viewport>
          <p>Wide</p>
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar orientation='horizontal' keepMounted>
          <ScrollArea.Thumb />
        </ScrollArea.Scrollbar>
      </ScrollArea>
    )
    await flushViewportMeasurement()

    expect(
      container.querySelector('[data-slot="scroll-area-scrollbar"]')
    ).toHaveAttribute('data-orientation', 'horizontal')
  })

  it('swaps the root element via render', async () => {
    const { container } = render(
      <ScrollArea render={<section />}>
        <ScrollArea.Viewport>
          <p>Content</p>
        </ScrollArea.Viewport>
      </ScrollArea>
    )
    await flushViewportMeasurement()
    const root = container.querySelector('[data-slot="scroll-area"]')!

    expect(root.tagName).toBe('SECTION')
  })

  it('lets a consumer override the viewport overflow through style', async () => {
    const { container } = render(
      <ScrollArea>
        <ScrollArea.Viewport style={{ overflowX: 'clip' }}>
          <p>Content</p>
        </ScrollArea.Viewport>
      </ScrollArea>
    )
    await flushViewportMeasurement()
    const viewport = container.querySelector<HTMLElement>(
      '[data-slot="scroll-area-viewport"]'
    )!

    expect(viewport.style.overflowX).toBe('clip')
  })

  it('releases the content min-width when fitWidth is off, keeping consumer styles', async () => {
    const { container } = render(
      <ScrollArea>
        <ScrollArea.Viewport>
          <ScrollArea.Content fitWidth={false} style={{ paddingTop: '8px' }}>
            <p>Content</p>
          </ScrollArea.Content>
        </ScrollArea.Viewport>
      </ScrollArea>
    )
    await flushViewportMeasurement()
    const content = container.querySelector<HTMLElement>(
      '[data-slot="scroll-area-content"]'
    )!

    expect(content.style.minWidth).toBe('0px')
    expect(content.style.paddingTop).toBe('8px')
  })

  it('keeps the content at its natural width by default', async () => {
    const { container } = render(
      <ScrollArea>
        <ScrollArea.Viewport>
          <ScrollArea.Content>
            <p>Content</p>
          </ScrollArea.Content>
        </ScrollArea.Viewport>
      </ScrollArea>
    )
    await flushViewportMeasurement()
    const content = container.querySelector<HTMLElement>(
      '[data-slot="scroll-area-content"]'
    )!

    expect(content.style.minWidth).not.toBe('0px')
  })

  it('merges consumer classes onto every part', async () => {
    const { container } = render(
      <ScrollArea className='custom-root'>
        <ScrollArea.Viewport className='custom-viewport'>
          <p>Content</p>
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar className='custom-bar' keepMounted>
          <ScrollArea.Thumb className='custom-thumb' />
        </ScrollArea.Scrollbar>
      </ScrollArea>
    )
    await flushViewportMeasurement()

    expect(container.querySelector('[data-slot="scroll-area"]')).toHaveClass(
      'custom-root'
    )
    expect(
      container.querySelector('[data-slot="scroll-area-viewport"]')
    ).toHaveClass('custom-viewport')
    expect(
      container.querySelector('[data-slot="scroll-area-scrollbar"]')
    ).toHaveClass('custom-bar')
    expect(
      container.querySelector('[data-slot="scroll-area-thumb"]')
    ).toHaveClass('custom-thumb')
  })

  it('sits the thumb 4px from the pane edge', async () => {
    const { container } = render(tree)
    await flushViewportMeasurement()
    const scrollbar = container.querySelector(
      '[data-slot="scroll-area-scrollbar"]'
    )!

    // The track's own padding (p-0.5, 2px) is inside its margin, so the
    // visible thumb inset is the sum of both — the margin has to carry the
    // rest of the 4px target, not the padding, which is what gives the
    // thumb its track.
    expect(scrollbar).toHaveClass('p-0.5')
    expect(scrollbar).toHaveClass('me-0.5')
    expect(scrollbar).not.toHaveClass('me-1')
  })

  it('sits a horizontal thumb the same 4px from its cross-axis edge', async () => {
    const { container } = render(
      <ScrollArea>
        <ScrollArea.Viewport>
          <p>Wide</p>
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar orientation='horizontal' keepMounted>
          <ScrollArea.Thumb />
        </ScrollArea.Scrollbar>
      </ScrollArea>
    )
    await flushViewportMeasurement()
    const scrollbar = container.querySelector(
      '[data-slot="scroll-area-scrollbar"]'
    )!

    expect(scrollbar).toHaveClass('p-0.5')
    expect(scrollbar).toHaveClass('mb-0.5')
    expect(scrollbar).not.toHaveClass('mb-1')
  })

  it('stands the scrollbar down on coarse pointers', async () => {
    const { container } = render(tree)
    await flushViewportMeasurement()

    expect(
      container.querySelector('[data-slot="scroll-area-scrollbar"]')
    ).toHaveClass('pointer-coarse:hidden')
  })

  it('exposes dot-notation display names', () => {
    expect(ScrollArea.displayName).toBe('ScrollArea.Root')
    expect(ScrollArea.Viewport.displayName).toBe('ScrollArea.Viewport')
    expect(ScrollArea.Scrollbar.displayName).toBe('ScrollArea.Scrollbar')
    expect(ScrollArea.Thumb.displayName).toBe('ScrollArea.Thumb')
    expect(ScrollArea.Content.displayName).toBe('ScrollArea.Content')
    expect(ScrollArea.Corner.displayName).toBe('ScrollArea.Corner')
  })

  it('aliases Root to the bare root', () => {
    expect(ScrollArea.Root).toBe(ScrollArea)
  })
})

describe('ScrollArea edge fade', () => {
  const viewportOf = (container: HTMLElement) =>
    container.querySelector<HTMLElement>('[data-slot="scroll-area-viewport"]')!

  it('applies no mask by default', async () => {
    const { container } = render(
      <ScrollArea>
        <ScrollArea.Viewport>
          <p>Content</p>
        </ScrollArea.Viewport>
      </ScrollArea>
    )
    await flushViewportMeasurement()

    expect(viewportOf(container).className).not.toContain('mask-image')
  })

  it('masks the block axis for fade="y"', async () => {
    const { container } = render(
      <ScrollArea>
        <ScrollArea.Viewport fade='y'>
          <p>Content</p>
        </ScrollArea.Viewport>
      </ScrollArea>
    )
    await flushViewportMeasurement()
    const className = viewportOf(container).className

    expect(className).toContain('to_bottom')
    expect(className).not.toContain('to_right')
  })

  it('masks the inline axis for fade="x"', async () => {
    const { container } = render(
      <ScrollArea>
        <ScrollArea.Viewport fade='x'>
          <p>Content</p>
        </ScrollArea.Viewport>
      </ScrollArea>
    )
    await flushViewportMeasurement()
    const className = viewportOf(container).className

    expect(className).toContain('to_right')
    expect(className).not.toContain('to_bottom')
  })

  it('intersects both masks for fade="both"', async () => {
    const { container } = render(
      <ScrollArea>
        <ScrollArea.Viewport fade='both'>
          <p>Content</p>
        </ScrollArea.Viewport>
      </ScrollArea>
    )
    await flushViewportMeasurement()
    const className = viewportOf(container).className

    expect(className).toContain('to_bottom')
    expect(className).toContain('to_right')
    expect(className).toContain('mask-composite:intersect')
    // Catches a `both` mask that drifts from a stale copy of either axis's
    // gradient — each stop var must appear, not just the direction keywords.
    expect(className).toContain('--scroll-area-fade-top')
    expect(className).toContain('--scroll-area-fade-bottom')
    expect(className).toContain('--scroll-area-fade-left')
    expect(className).toContain('--scroll-area-fade-right')
  })

  it('only opens a fade on the edge Base UI reports as overflowing', async () => {
    const { container } = render(
      <ScrollArea>
        <ScrollArea.Viewport fade='y'>
          <p>Content</p>
        </ScrollArea.Viewport>
      </ScrollArea>
    )
    await flushViewportMeasurement()
    const className = viewportOf(container).className

    // The gradient stops sit at 0 until Base UI flags the edge, so a
    // non-overflowing area paints an inert full-opacity mask.
    expect(className).toContain('data-[overflow-y-start]')
    expect(className).toContain('data-[overflow-y-end]')
  })

  it('lets a consumer retune the fade depth', async () => {
    const { container } = render(
      <ScrollArea>
        <ScrollArea.Viewport
          fade='y'
          style={{ '--scroll-area-fade-size': '4rem' } as CSSProperties}
        >
          <p>Content</p>
        </ScrollArea.Viewport>
      </ScrollArea>
    )
    await flushViewportMeasurement()

    expect(
      viewportOf(container).style.getPropertyValue('--scroll-area-fade-size')
    ).toBe('4rem')
  })

  // jsdom reports every element as zero-sized, so Base UI measures no overflow
  // and omits `data-has-overflow-*`. That is the case worth pinning: a
  // kept-mounted bar must stay transparent until the axis it serves overflows,
  // because `keepMounted` is exactly what stops Base UI hiding it itself.
  it('reveals a kept-mounted scrollbar only when its axis overflows', async () => {
    const { container } = render(
      <ScrollArea>
        <ScrollArea.Viewport>
          <p>Content</p>
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar keepMounted>
          <ScrollArea.Thumb />
        </ScrollArea.Scrollbar>
      </ScrollArea>
    )
    await flushViewportMeasurement()

    const scrollbar = container.querySelector(
      '[data-slot="scroll-area-scrollbar"]'
    ) as HTMLElement

    expect(scrollbar).toBeTruthy()
    expect(scrollbar.hasAttribute('data-has-overflow-y')).toBe(false)
    expect(scrollbar.className).toContain('opacity-0')
    // Every reveal is qualified by the overflow attribute, so none can fire.
    for (const cls of scrollbar.className.split(/\s+/)) {
      if (cls.endsWith('opacity-100')) {
        expect(cls).toContain('has-overflow')
      }
    }
  })
})
