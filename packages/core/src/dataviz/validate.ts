import { type Oklch, contrastRatio, deltaE, worstCvdDeltaE } from './color-math'
import {
  type ByMode,
  DIVERGE_MID,
  MODES,
  type Mode,
  type Palette,
  palette as defaultPalette
} from './palette'

export const TARGETS = {
  adjacentCvd: 8,
  firstFiveCvd: 8,
  adjacentNormal: 15,
  dangerNormal: 12,
  darkMarkContrast: 3,
  setCvd: 15,
  darkGreyContrast: 3
} as const

export type Failure = {
  check: keyof typeof TARGETS | 'heatOrder' | 'divergingOrder'
  mode: Mode
  detail: string
  score: number
  target: number
}

const round = (n: number) => Math.round(n * 10) / 10

function pairs(count: number, adjacentOnly: boolean): [number, number][] {
  const out: [number, number][] = []
  for (let i = 0; i < count; i++)
    for (let j = i + 1; j < count; j++)
      if (!adjacentOnly || j === i + 1) out.push([i, j])
  return out
}

function worst(
  colors: readonly Oklch[],
  list: [number, number][],
  score: (a: Oklch, b: Oklch) => number
) {
  return Math.min(...list.map(([i, j]) => score(colors[i]!, colors[j]!)))
}

export function validatePalette(p: Palette = defaultPalette): Failure[] {
  const failures: Failure[] = []
  const fail = (
    check: Failure['check'],
    mode: Mode,
    detail: string,
    score: number,
    target: number
  ) => failures.push({ check, mode, detail, score: round(score), target })

  for (const mode of MODES) {
    const cat = p.categorical[mode]

    for (const [i, j] of pairs(cat.length, true)) {
      const slots = `slots ${i + 1} and ${j + 1}`
      const cvd = worstCvdDeltaE(cat[i]!, cat[j]!)
      if (cvd < TARGETS.adjacentCvd)
        fail('adjacentCvd', mode, slots, cvd, TARGETS.adjacentCvd)
      const normal = deltaE(cat[i]!, cat[j]!)
      if (normal < TARGETS.adjacentNormal)
        fail('adjacentNormal', mode, slots, normal, TARGETS.adjacentNormal)
    }

    for (const [i, j] of pairs(5, false)) {
      const cvd = worstCvdDeltaE(cat[i]!, cat[j]!)
      if (cvd < TARGETS.firstFiveCvd)
        fail(
          'firstFiveCvd',
          mode,
          `slots ${i + 1} and ${j + 1}`,
          cvd,
          TARGETS.firstFiveCvd
        )
    }

    const danger = p.status.critical.value[mode]
    cat.forEach((c, i) => {
      const normal = deltaE(c, danger)
      if (normal < TARGETS.dangerNormal)
        fail(
          'dangerNormal',
          mode,
          `slot ${i + 1} vs critical`,
          normal,
          TARGETS.dangerNormal
        )
    })

    for (const [name, set] of Object.entries(p.sets)) {
      const colors = set.map((slot) => cat[slot - 1]!)
      const cvd = worst(colors, pairs(colors.length, false), worstCvdDeltaE)
      if (cvd < TARGETS.setCvd) fail('setCvd', mode, name, cvd, TARGETS.setCvd)
    }

    const heatL = p.heat[mode].map(([l]) => l)
    const heatSorted = heatL.every(
      (l, i) =>
        i === 0 || (mode === 'light' ? l < heatL[i - 1]! : l > heatL[i - 1]!)
    )
    if (!heatSorted)
      fail('heatOrder', mode, 'lightness must run away from the surface', 0, 1)

    const div = p.diverging[mode]
    const midL = div[DIVERGE_MID]![0]
    const spread = div.map(([l]) => Math.abs(l - midL))
    const outward = spread.every(
      (s, i) =>
        i === DIVERGE_MID ||
        (i < DIVERGE_MID ? s > spread[i + 1]! : s > spread[i - 1]!)
    )
    if (!outward)
      fail(
        'divergingOrder',
        mode,
        'each arm must move away from the midpoint',
        0,
        1
      )
  }

  const darkSurface = p.surface.dark
  p.categorical.dark.forEach((c, i) => {
    const ratio = contrastRatio(c, darkSurface)
    if (ratio < TARGETS.darkMarkContrast)
      fail(
        'darkMarkContrast',
        'dark',
        `slot ${i + 1}`,
        ratio,
        TARGETS.darkMarkContrast
      )
  })
  for (const name of ['context', 'other'] as const) {
    const grey = p.neutral.dark[p.greys[name].dark.step]!
    const ratio = contrastRatio(grey, darkSurface)
    if (ratio < TARGETS.darkGreyContrast)
      fail('darkGreyContrast', 'dark', name, ratio, TARGETS.darkGreyContrast)
  }

  return failures
}

type Scores = {
  adjacentCvd: number
  firstFiveCvd: number
  adjacentNormal: number
  lightSlotsUnder3: number[]
}

export function paletteScores(p: Palette = defaultPalette): ByMode<Scores> {
  const score = (mode: Mode): Scores => {
    const cat = p.categorical[mode]
    return {
      adjacentCvd: round(worst(cat, pairs(cat.length, true), worstCvdDeltaE)),
      firstFiveCvd: round(worst(cat, pairs(5, false), worstCvdDeltaE)),
      adjacentNormal: round(worst(cat, pairs(cat.length, true), deltaE)),
      lightSlotsUnder3: cat.flatMap((c, i) =>
        contrastRatio(c, p.surface[mode]) < 3 ? [i + 1] : []
      )
    }
  }
  return { light: score('light'), dark: score('dark') }
}
