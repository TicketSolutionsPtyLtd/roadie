import { describe, expect, it } from 'vitest'

import { type Oklch, deltaE } from './color-math'
import { DIVERGE_MID, type Palette, palette } from './palette'
import { paletteScores, validatePalette } from './validate'

const withLight = (slot: number, value: Oklch): Palette => ({
  ...palette,
  categorical: {
    ...palette.categorical,
    light: palette.categorical.light.map((c, i) => (i === slot ? value : c))
  }
})

const withDark = (slot: number, value: Oklch): Palette => ({
  ...palette,
  categorical: {
    ...palette.categorical,
    dark: palette.categorical.dark.map((c, i) => (i === slot ? value : c))
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

  it('catches two far-apart slots too close for normal vision', () => {
    const [l, c, h] = palette.categorical.light[0]!
    const failure = validatePalette(withLight(7, [l + 0.02, c, h + 4])).find(
      (f) => f.check === 'allPairsNormal'
    )
    expect(failure).toMatchObject({ detail: 'slots 1 and 8', target: 8 })
  })

  // The closest pairs. Dark 3 and 6, and 2 and 7, were accepted on #414.
  it.each([
    ['light', 5, 7, 17.2],
    ['dark', 1, 8, 8.5],
    ['dark', 3, 6, 9.5],
    ['dark', 2, 7, 10.7]
  ] as const)(
    'keeps %s slots %i and %i at ΔE %d for normal vision',
    (mode, a, b, distance) => {
      const cat = palette.categorical[mode]
      expect(deltaE(cat[a - 1]!, cat[b - 1]!)).toBeCloseTo(distance, 1)
    }
  )

  it('reports the closest pair of any two slots', () => {
    const scores = paletteScores()
    expect(scores.light.allPairsNormal).toBe(17.2)
    expect(scores.dark.allPairsNormal).toBe(8.5)
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

  // 4.2:1 passes WCAG 2's 3:1 but measures Lc 32 against the dark page.
  it('measures dark marks with APCA at Lc 45, not a 3:1 ratio', () => {
    const failure = validatePalette(withDark(2, [0.577, 0.094, 186])).find(
      (f) => f.check === 'darkMarkContrast'
    )
    expect(failure).toMatchObject({ detail: 'slot 3', score: 32.4, target: 45 })
  })

  it('measures dark context and other greys with APCA at Lc 45', () => {
    const failures = validatePalette({
      ...palette,
      greys: {
        ...palette.greys,
        context: { ...palette.greys.context, dark: { step: 9 } },
        other: { ...palette.greys.other, dark: { step: 10 } }
      }
    }).filter((f) => f.check === 'darkGreyContrast')
    expect(failures).toMatchObject([
      { detail: 'context', score: 25.4, target: 45 },
      { detail: 'other', score: 31.2, target: 45 }
    ])
  })

  it('uses blue and pink for pairs, adding teal for trios', () => {
    expect(palette.sets).toEqual({ pair: [1, 2], trio: [1, 2, 3] })
  })

  it('reports the scores the docs publish', () => {
    const scores = paletteScores()
    expect(scores.light.firstFiveCvd).toBeGreaterThanOrEqual(8)
    expect(scores.dark.firstFiveCvd).toBeGreaterThanOrEqual(8)
  })

  it('lists the slots under APCA Lc 45 on the page, which never carry text', () => {
    const scores = paletteScores()
    expect(scores.light.slotsUnderLc45).toEqual([4, 8])
    expect(scores.dark.slotsUnderLc45).toEqual([])
  })

  it('keeps the deprecated name reading the APCA slots', () => {
    const scores = paletteScores()
    expect(scores.light.lightSlotsUnder3).toEqual([4, 8])
    expect(scores.dark.lightSlotsUnder3).toEqual([])
  })
})
