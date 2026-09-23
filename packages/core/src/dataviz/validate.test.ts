import { describe, expect, it } from 'vitest'

import type { Oklch } from './color-math'
import { DIVERGE_MID, type Palette, palette } from './palette'
import { paletteScores, validatePalette } from './validate'

const withLight = (slot: number, value: Oklch): Palette => ({
  ...palette,
  categorical: {
    ...palette.categorical,
    light: palette.categorical.light.map((c, i) => (i === slot ? value : c))
  }
})

describe('dataviz palette', () => {
  it('passes every target in both modes', () => {
    expect(validatePalette()).toEqual([])
  })

  it('has 8 categorical slots, 9 heat steps and 9 diverging steps per mode', () => {
    for (const mode of ['light', 'dark'] as const) {
      expect(palette.categorical[mode]).toHaveLength(8)
      expect(palette.heat[mode]).toHaveLength(9)
      expect(palette.diverging[mode]).toHaveLength(9)
    }
  })

  it('uses a hueless neutral step as the diverging midpoint', () => {
    expect(palette.diverging.light[DIVERGE_MID]).toEqual(
      palette.neutral.light[3]
    )
    expect(palette.diverging.dark[DIVERGE_MID]).toEqual(palette.neutral.dark[6])
  })

  it('catches a slot that collides with its neighbour for colour-blind readers', () => {
    const failures = validatePalette(
      withLight(1, palette.categorical.light[0]!)
    )
    expect(failures.map((f) => f.check)).toContain('adjacentCvd')
  })

  it('catches a series colour that reads as danger', () => {
    const failures = validatePalette(
      withLight(6, palette.status.critical.value.light)
    )
    expect(failures.map((f) => f.check)).toContain('dangerNormal')
  })

  it('catches a heat ramp that is out of lightness order', () => {
    const heat = { ...palette.heat, light: [...palette.heat.light].reverse() }
    expect(validatePalette({ ...palette, heat }).map((f) => f.check)).toContain(
      'heatOrder'
    )
  })

  it('catches two of the first five colliding even when not adjacent', () => {
    const failures = validatePalette(
      withLight(2, palette.categorical.light[0]!)
    )
    expect(failures.map((f) => f.check)).toContain('firstFiveCvd')
  })

  it('catches neighbours too close for normal vision', () => {
    const [l, c, h] = palette.categorical.light[0]!
    const failures = validatePalette(withLight(1, [l + 0.03, c, h + 8]))
    expect(failures.map((f) => f.check)).toContain('adjacentNormal')
  })

  it('catches a small set whose colours collide', () => {
    const failures = validatePalette({
      ...palette,
      sets: { pair: [1, 1], trio: palette.sets.trio }
    })
    expect(failures.map((f) => f.check)).toContain('setCvd')
  })

  it('catches a diverging arm that runs back toward the midpoint', () => {
    const light = palette.diverging.light.map((c, i) =>
      i === 0 ? palette.diverging.light[DIVERGE_MID]! : c
    )
    const failures = validatePalette({
      ...palette,
      diverging: { ...palette.diverging, light }
    })
    expect(failures.map((f) => f.check)).toContain('divergingOrder')
  })

  it('catches a dark mark that disappears into the dark surface', () => {
    const dark = palette.categorical.dark.map((c, i) =>
      i === 0 ? palette.surface.dark : c
    )
    const failures = validatePalette({
      ...palette,
      categorical: { ...palette.categorical, dark }
    })
    expect(failures.map((f) => f.check)).toContain('darkMarkContrast')
  })

  it('catches a context grey too faint on the dark surface', () => {
    const failures = validatePalette({
      ...palette,
      greys: {
        ...palette.greys,
        context: { ...palette.greys.context, dark: { step: 2 } }
      }
    })
    expect(failures.map((f) => f.check)).toContain('darkGreyContrast')
  })

  it('uses blue and pink for pairs, adding teal for trios', () => {
    expect(palette.sets).toEqual({ pair: [1, 2], trio: [1, 2, 3] })
  })

  it('reports the scores the docs publish', () => {
    const scores = paletteScores()
    expect(scores.light.firstFiveCvd).toBeGreaterThanOrEqual(8)
    expect(scores.dark.firstFiveCvd).toBeGreaterThanOrEqual(8)
    expect(scores.light.lightSlotsUnder3).toEqual([2, 4, 6, 8])
  })
})
