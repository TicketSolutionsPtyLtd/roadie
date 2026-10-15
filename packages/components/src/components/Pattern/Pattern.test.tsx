import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Pattern, type PatternCrop } from '.'
import * as barrel from '../../index'
import shapes from './shapes.json'

function renderPattern(ui: React.ReactElement) {
  const { container } = render(ui)
  const root = container.querySelector('[data-slot=pattern]')!
  return { root, svg: root.querySelector('svg')! }
}

const [x, y, w, h] = shapes.safe.split(' ').map(Number) as [
  number,
  number,
  number,
  number
]

describe('Pattern', () => {
  it('is decoration, hidden from assistive technology and focus', () => {
    const { root, svg } = renderPattern(<Pattern />)
    expect(root).toHaveAttribute('aria-hidden', 'true')
    expect(svg).toHaveAttribute('focusable', 'false')
  })

  it('draws a ground and every swirl of the artwork', () => {
    const { svg } = renderPattern(<Pattern crop='top' />)
    expect(svg.querySelectorAll('rect')).toHaveLength(1)
    expect(
      [...svg.querySelectorAll('path')].map((p) => p.getAttribute('d'))
    ).toEqual(shapes.paths)
  })

  it.each([
    ['top', null, [x, y, w, h]],
    ['banner', null, [x, y, w, h]],
    ['bottom', 'scale(1 -1)', [x, -(y + h), w, h]],
    ['left', 'rotate(-90)', [y, -(x + w), h, w]],
    ['right', 'rotate(90)', [-(y + h), x, h, w]]
  ] as const)(
    'turns the artwork for %s with %s and shows its safe area',
    (crop, transform, viewBox) => {
      const { svg } = renderPattern(<Pattern crop={crop} />)
      expect(svg.querySelector('g')?.getAttribute('transform') ?? null).toBe(
        transform
      )
      expect(svg).toHaveAttribute('viewBox', viewBox.join(' '))
    }
  )

  it('never lets the browser stretch the artwork', () => {
    const { svg } = renderPattern(<Pattern />)
    expect(svg).not.toHaveAttribute('preserveAspectRatio')
  })

  it('defaults to the right crop', () => {
    const { svg } = renderPattern(<Pattern />)
    expect(svg.querySelector('g')).toHaveAttribute('transform', 'rotate(90)')
  })

  it('falls back to the right crop for an unknown one', () => {
    const { svg } = renderPattern(
      <Pattern crop={'diagonal' as unknown as PatternCrop} />
    )
    expect(svg.querySelector('g')).toHaveAttribute('transform', 'rotate(90)')
  })

  it('passes other attributes through', () => {
    const { root } = renderPattern(<Pattern data-testid='hero-pattern' />)
    expect(root).toHaveAttribute('data-testid', 'hero-pattern')
  })

  it('is exported from the package barrel', () => {
    expect(barrel.Pattern).toBe(Pattern)
  })
})
