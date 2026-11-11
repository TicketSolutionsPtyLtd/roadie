import { createRef } from 'react'

import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import {
  SpotIllustration,
  type SpotIllustrationLayers,
  createSpotIllustration
} from './SpotIllustration'

const LAYERS: SpotIllustrationLayers = [
  ['shadow', 'M4 4h40v40H4z'],
  ['face', 'M4 4h30v30H4z'],
  ['stroke', 'M4 4h30v30H4z']
]

const parts = (svg: Element, selector = ':scope > path') =>
  [...svg.querySelectorAll(selector)].map((p) => p.getAttribute('data-part'))

describe('SpotIllustration', () => {
  it('draws one path per layer, in order', () => {
    const { container } = render(<SpotIllustration layers={LAYERS} />)
    const svg = container.querySelector('svg')!
    expect(svg).toHaveAttribute('viewBox', '0 0 48 48')
    expect(parts(svg)).toEqual(['shadow', 'face', 'stroke'])
  })

  it('fills even-odd, so a layer can have holes', () => {
    const { container } = render(<SpotIllustration layers={LAYERS} />)
    const face = container.querySelector('[data-part="face"]')!
    expect(face).toHaveStyle({ fillRule: 'evenodd' })
  })

  it('draws no outline unless asked', () => {
    const { container } = render(<SpotIllustration layers={LAYERS} />)
    expect(container.querySelector('[data-part="outline"]')).toBeNull()
  })

  it('draws the outline behind the art, from every layer', () => {
    const { container } = render(<SpotIllustration layers={LAYERS} outline />)
    const svg = container.querySelector('svg')!
    const outline = svg.firstElementChild!
    expect(outline).toHaveAttribute('data-part', 'outline')
    expect(outline.querySelectorAll('path')).toHaveLength(3)
  })

  it('leaves the stroke layer unfilled in the outline, so open lines add no area', () => {
    const { container } = render(<SpotIllustration layers={LAYERS} outline />)
    const outlines = container.querySelectorAll<SVGPathElement>(
      '[data-part="outline"] path'
    )
    expect(outlines[2]!.style.fill).toBe('none')
    expect(outlines[1]!.style.fill).toBe('')
  })

  it('is hidden from assistive tech unless labelled', () => {
    const { container, rerender } = render(<SpotIllustration layers={LAYERS} />)
    expect(container.querySelector('svg')).toHaveAttribute(
      'aria-hidden',
      'true'
    )

    rerender(<SpotIllustration layers={LAYERS} aria-label='Ticket' />)
    const svg = container.querySelector('svg')!
    expect(svg).not.toHaveAttribute('aria-hidden')
    expect(svg).toHaveAttribute('role', 'img')
  })

  it('is named by another element through aria-labelledby', () => {
    const { getByRole } = render(
      <>
        <p id='spot-name'>Ticket</p>
        <SpotIllustration layers={LAYERS} aria-labelledby='spot-name' />
      </>
    )
    expect(getByRole('img', { name: 'Ticket' })).toBeInTheDocument()
  })

  it('takes a size class that replaces the default', () => {
    const { container } = render(
      <SpotIllustration layers={LAYERS} className='size-24' />
    )
    const svg = container.querySelector('svg')!
    expect(svg).toHaveClass('size-24')
    expect(svg).not.toHaveClass('size-12')
  })

  it('forwards the ref and other svg props', () => {
    const ref = createRef<SVGSVGElement>()
    const { container } = render(
      <SpotIllustration layers={LAYERS} ref={ref} data-testid='spot' />
    )
    expect(ref.current).toBe(container.querySelector('svg'))
    expect(ref.current).toHaveAttribute('data-testid', 'spot')
  })
})

describe('createSpotIllustration', () => {
  it('names the component and draws its layers', () => {
    const Square = createSpotIllustration('Square', LAYERS)
    expect(Square.displayName).toBe('Square')
    const { container } = render(<Square outline />)
    expect(container.querySelector('[data-part="outline"]')).not.toBeNull()
    expect(parts(container.querySelector('svg')!)).toEqual([
      'shadow',
      'face',
      'stroke'
    ])
  })
})
