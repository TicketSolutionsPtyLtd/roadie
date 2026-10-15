import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Pattern, type PatternCrop } from '.'
import * as barrel from '../../index'
import shapes from './shapes.json'

function renderPattern(ui: React.ReactElement) {
  const { container } = render(ui)
  return container.querySelector('svg')!
}

describe('Pattern', () => {
  it('is decoration, hidden from assistive technology and focus', () => {
    const svg = renderPattern(<Pattern />)
    expect(svg).toHaveAttribute('data-slot', 'pattern')
    expect(svg).toHaveAttribute('aria-hidden', 'true')
    expect(svg).toHaveAttribute('focusable', 'false')
  })

  it('draws a ground and every swirl of the crop', () => {
    const svg = renderPattern(<Pattern crop='top' />)
    expect(svg.querySelectorAll('rect')).toHaveLength(1)
    expect(
      [...svg.querySelectorAll('path')].map((p) => p.getAttribute('d'))
    ).toEqual(shapes.banner.paths)
  })

  it.each([
    ['top', 'banner', 'xMidYMin slice'],
    ['bottom', 'banner', 'xMidYMax slice'],
    ['left', 'left', 'xMinYMid slice'],
    ['right', 'right', 'xMaxYMid slice'],
    ['banner', 'banner', 'xMidYMid slice']
  ] as const)(
    'covers a %s box with the whole %s artwork, anchored %s',
    (crop, field, align) => {
      const svg = renderPattern(<Pattern crop={crop} />)
      expect(svg).toHaveAttribute('viewBox', shapes[field].viewBox)
      expect(svg).toHaveAttribute('preserveAspectRatio', align)
    }
  )

  it('defaults to the right crop', () => {
    const svg = renderPattern(<Pattern />)
    expect(svg).toHaveAttribute('viewBox', shapes.right.viewBox)
    expect(svg).toHaveAttribute('preserveAspectRatio', 'xMaxYMid slice')
  })

  it('falls back to the right crop for an unknown one', () => {
    const svg = renderPattern(
      <Pattern crop={'diagonal' as unknown as PatternCrop} />
    )
    expect(svg).toHaveAttribute('viewBox', shapes.right.viewBox)
    expect(svg).toHaveAttribute('preserveAspectRatio', 'xMaxYMid slice')
  })

  it('passes other SVG attributes through', () => {
    const svg = renderPattern(<Pattern data-testid='hero-pattern' />)
    expect(svg).toHaveAttribute('data-testid', 'hero-pattern')
  })

  it('is exported from the package barrel', () => {
    expect(barrel.Pattern).toBe(Pattern)
  })
})
