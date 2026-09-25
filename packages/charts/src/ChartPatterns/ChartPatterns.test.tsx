import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { CHART_TEXTURE_COUNT, ChartPatterns, chartTextureId } from '.'

describe('ChartPatterns', () => {
  it('defines one hidden pattern per slot', () => {
    const { container } = render(<ChartPatterns />)
    expect(container.querySelector('svg')).toHaveAttribute(
      'aria-hidden',
      'true'
    )
    for (let slot = 1; slot <= CHART_TEXTURE_COUNT; slot++)
      expect(
        container.querySelector(`pattern#${chartTextureId(slot)}`)
      ).not.toBeNull()
  })
})
