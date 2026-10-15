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
    ).toEqual(shapes.banner.paths)
  })

  it.each([
    ['top', 'banner'],
    ['bottom', 'banner'],
    ['banner', 'banner'],
    ['left', 'left'],
    ['right', 'right']
  ] as const)(
    'shows the %s crop from the safe area of the %s artwork',
    (crop, field) => {
      const { svg } = renderPattern(<Pattern crop={crop} />)
      expect(svg).toHaveAttribute('viewBox', shapes[field].safe)
    }
  )

  it('never lets the browser stretch the artwork', () => {
    const { svg } = renderPattern(<Pattern />)
    expect(svg).not.toHaveAttribute('preserveAspectRatio')
  })

  it('defaults to the right crop', () => {
    const { svg } = renderPattern(<Pattern />)
    expect(svg).toHaveAttribute('viewBox', shapes.right.safe)
  })

  it('falls back to the right crop for an unknown one', () => {
    const { svg } = renderPattern(
      <Pattern crop={'diagonal' as unknown as PatternCrop} />
    )
    expect(svg).toHaveAttribute('viewBox', shapes.right.safe)
  })

  it('passes other attributes through', () => {
    const { root } = renderPattern(<Pattern data-testid='hero-pattern' />)
    expect(root).toHaveAttribute('data-testid', 'hero-pattern')
  })

  it('is exported from the package barrel', () => {
    expect(barrel.Pattern).toBe(Pattern)
  })
})
