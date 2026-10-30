import type { ReactNode } from 'react'

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { PHONE, atWidth, withBrowserPage } from '../_test/browser'
import { BlockSurface, type BlockSurfaceProps } from './BlockSurface'

withBrowserPage()

const WIDE = { width: 1440, height: 900 }

// A block's root is its container, so the frame's padding and corners follow the block's width.
function Block({ children }: { children: ReactNode }) {
  return <div style={{ containerType: 'inline-size' }}>{children}</div>
}

function renderSurface(props: BlockSurfaceProps) {
  const { container } = render(
    <Block>
      <BlockSurface {...props}>
        <p>Content</p>
      </BlockSurface>
    </Block>
  )
  return {
    block: container.firstElementChild!.getBoundingClientRect(),
    surface: container.querySelector('[data-slot=block-surface]'),
    content: screen.getByText('Content').getBoundingClientRect()
  }
}

const radiusOf = (element: Element) =>
  parseFloat(getComputedStyle(element).borderTopLeftRadius)

describe('BlockSurface', () => {
  it('holds the content on the page to its measure, inside the page padding', async () => {
    await atWidth(WIDE.width, WIDE.height)
    const { block, surface, content } = renderSurface({ width: '4xl' })

    expect(surface).toBeNull()
    expect(content.width).toBeLessThanOrEqual(896)
    expect(content.left - block.left).toBeCloseTo(
      block.right - content.right,
      0
    )

    await atWidth(PHONE.width, PHONE.height)
    expect(
      screen.getByText('Content').getBoundingClientRect().left
    ).toBeGreaterThan(block.left)
  })

  it('runs a band square to the block’s edges when narrow, and rounds it once wide', async () => {
    await atWidth(PHONE.width, PHONE.height)
    const { block, surface } = renderSurface({ emphasis: 'subtle' })

    expect(surface!.getBoundingClientRect().width).toBeCloseTo(block.width, 0)
    expect(radiusOf(surface!)).toBe(0)

    await atWidth(WIDE.width, WIDE.height)
    expect(radiusOf(surface!)).toBeGreaterThan(0)
  })

  it('keeps an inset panel inside the page padding, rounded even when narrow', async () => {
    await atWidth(PHONE.width, PHONE.height)
    const { block, surface } = renderSurface({
      emphasis: 'raised',
      inset: true
    })
    const panel = surface!.getBoundingClientRect()

    expect(panel.left).toBeGreaterThan(block.left)
    expect(panel.right).toBeLessThan(block.right)
    expect(radiusOf(surface!)).toBeGreaterThan(0)
  })
})
