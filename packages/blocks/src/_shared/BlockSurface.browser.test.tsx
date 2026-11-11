import type { ReactNode } from 'react'

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Cards } from '../Cards'
import { Hero } from '../Hero'
import { bento, pathPhoto } from '../Hero/fixtures'
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

  it.each([PHONE.width, WIDE.width, 1920])(
    'runs a band square to the block’s edges at %ipx',
    async (width) => {
      await atWidth(width, WIDE.height)
      const { block, surface } = renderSurface({ emphasis: 'subtle' })
      const band = surface!.getBoundingClientRect()

      expect(band.left).toBeCloseTo(block.left, 0)
      expect(band.right).toBeCloseTo(block.right, 0)
      expect(radiusOf(surface!)).toBe(0)
    }
  )

  it.each([PHONE.width, 900, WIDE.width, 1920])(
    'lines a contained panel up with the hero’s edges at %ipx, rounded',
    async (width) => {
      await atWidth(width, WIDE.height)
      render(
        <>
          <Hero {...bento(pathPhoto)} />
          <Cards
            preset='plain'
            emphasis='raised'
            contained
            title='Why Oztix'
            cards={[{ title: 'Sell more tickets' }]}
          />
        </>
      )
      const hero = document
        .querySelector('[data-slot=hero-heading]')!
        .parentElement!.getBoundingClientRect()
      const surface = document.querySelector('[data-slot=block-surface]')!
      const panel = surface.getBoundingClientRect()

      expect(panel.left).toBeCloseTo(hero.left, 0)
      expect(panel.right).toBeCloseTo(hero.right, 0)
      expect(radiusOf(surface)).toBeGreaterThan(0)
    }
  )
})
