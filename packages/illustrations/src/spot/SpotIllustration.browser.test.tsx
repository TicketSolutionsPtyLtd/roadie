import { render } from '@testing-library/react'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import roadieCss from '../../vitest.browser.css?inline'
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

describe('SpotIllustration colours', () => {
  it('paints each layer in its illustration colour', () => {
    const { container } = render(<Heart />)
    const svg = container.querySelector('svg')!
    expect(paint(svg, 'shadow').fill).toBe(
      tokenColour('--color-illustration-shadow')
    )
    expect(paint(svg, 'face').fill).toBe(
      tokenColour('--color-illustration-face')
    )
    expect(paint(svg, 'stroke').stroke).toBe(
      tokenColour('--color-illustration-stroke')
    )
    expect(paint(svg, 'stroke').fill).toBe('none')
  })

  it('keeps the same colours in dark mode', () => {
    const { container } = render(<Heart />)
    const svg = container.querySelector('svg')!
    const light = paint(svg, 'face').fill
    document.documentElement.classList.add('dark')
    expect(paint(svg, 'face').fill).toBe(light)
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
