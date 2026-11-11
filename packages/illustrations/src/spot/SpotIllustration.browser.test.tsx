import { render } from '@testing-library/react'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import roadieCss from '../../vitest.browser.css?inline'
import { SpotIllustration } from './SpotIllustration'
import { Heart } from './illustrations/Heart'

let style: HTMLStyleElement
beforeAll(() => {
  style = document.createElement('style')
  style.textContent = roadieCss
  document.head.append(style)
})
afterAll(() => {
  style.remove()
  document.documentElement.classList.remove('dark')
})

/** A token's colour as the browser computes it, for comparing with a painted fill. */
function tokenColour(name: string) {
  const probe = document.createElement('div')
  probe.style.color = `var(${name})`
  document.body.append(probe)
  const colour = getComputedStyle(probe).color
  probe.remove()
  return colour
}

const paint = (svg: Element, part: string) =>
  getComputedStyle(svg.querySelector(`[data-part="${part}"]`)!)

const SQUARE = 'M4 4h30v30H4z'
const EVERY_LAYER = (
  ['shadow', 'face', 'detail', 'highlight', 'stroke'] as const
).map((layer) => [layer, SQUARE] as const)
const FILLS = ['shadow', 'face', 'detail', 'highlight'] as const

describe('SpotIllustration colours', () => {
  it('paints each layer in its illustration colour', () => {
    const { container } = render(<SpotIllustration layers={EVERY_LAYER} />)
    const svg = container.querySelector('svg')!
    for (const layer of FILLS)
      expect(paint(svg, layer).fill, layer).toBe(
        tokenColour(`--color-illustration-${layer}`)
      )
    expect(paint(svg, 'stroke').stroke).toBe(
      tokenColour('--color-illustration-stroke')
    )
    expect(paint(svg, 'stroke').fill).toBe('none')
  })

  it('keeps the same colours in dark mode', () => {
    const { container } = render(
      <SpotIllustration layers={EVERY_LAYER} outline />
    )
    const svg = container.querySelector('svg')!
    const colours = () =>
      [...FILLS, 'stroke', 'outline'].map((part) => {
        const { fill, stroke } = paint(svg, part)
        return { part, fill, stroke }
      })
    const light = colours()
    document.documentElement.classList.add('dark')
    expect(colours()).toEqual(light)
    document.documentElement.classList.remove('dark')
  })

  it('draws the outline in the outline colour, 4 wide, so it reaches 2 past the art', () => {
    const { container } = render(<Heart outline />)
    const outline = paint(container.querySelector('svg')!, 'outline')
    const white = tokenColour('--color-illustration-outline')
    expect(outline.stroke).toBe(white)
    expect(outline.fill).toBe(white)
    expect(outline.strokeWidth).toBe('4px')
  })

  it('renders 48 CSS pixels square by default', () => {
    const { container } = render(<Heart />)
    const { width, height } = container
      .querySelector('svg')!
      .getBoundingClientRect()
    expect([width, height]).toEqual([48, 48])
  })
})
