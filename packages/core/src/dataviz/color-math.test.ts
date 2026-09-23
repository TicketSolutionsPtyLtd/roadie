import { describe, expect, it } from 'vitest'

import {
  clampChroma,
  contrastRatio,
  deltaE,
  toHex,
  worstCvdDeltaE
} from './color-math'

const red = [0.6279554, 0.2576833, 29.2338858] as const
const green = [0.8664396, 0.2948272, 142.4953389] as const

describe('color maths', () => {
  it('converts OKLCH to sRGB hex', () => {
    expect(toHex([1, 0, 0])).toBe('#ffffff')
    expect(toHex([0, 0, 0])).toBe('#000000')
    expect(toHex(red)).toBe('#ff0000')
    expect(toHex(green)).toBe('#00ff00')
  })

  it('pulls out-of-gamut colours back by reducing chroma only', () => {
    const [l, c, h] = clampChroma([0.7, 0.4, 150])
    expect(l).toBe(0.7)
    expect(h).toBe(150)
    expect(c).toBeLessThan(0.4)
    expect(c).toBeGreaterThan(0.1)
  })

  it('measures contrast on the WCAG scale', () => {
    expect(contrastRatio([1, 0, 0], [0, 0, 0])).toBeCloseTo(21, 1)
    expect(contrastRatio([0.5, 0, 0], [0.5, 0, 0])).toBe(1)
  })

  it('scores identical colours as indistinguishable', () => {
    expect(deltaE(red, red)).toBe(0)
    expect(worstCvdDeltaE(red, red)).toBe(0)
  })

  it('shows red and green collapsing for colour-blind readers', () => {
    expect(deltaE(red, green)).toBeGreaterThan(40)
    expect(deltaE(red, green, 'deutan')).toBeLessThan(deltaE(red, green))
    expect(worstCvdDeltaE(red, green)).toBeLessThanOrEqual(
      deltaE(red, green, 'protan')
    )
  })
})
