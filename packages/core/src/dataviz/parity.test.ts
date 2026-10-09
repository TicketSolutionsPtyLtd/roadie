import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { type Oklch, apcaLc } from './color-math'
import { DEFAULT_ACCENT_HUE, palette } from './palette'

const tokens = readFileSync(
  new URL('../css/tokens.css', import.meta.url),
  'utf8'
)
const modern = tokens.slice(tokens.indexOf('@supports (color: oklch(0 0 0))'))
const modernDark = modern.slice(modern.indexOf('\n  .dark'))
const modernLight = modern.slice(0, modern.indexOf('\n  .dark'))

function lightnessAndChroma(css: string, name: string) {
  const match = css.match(
    new RegExp(`--${name}: oklch\\(([\\d.]+) ([\\d.]+) .*?\\);`)
  )
  return match ? [Number(match[1]), Number(match[2])] : null
}

const lightNeutral = (step: number) =>
  lightnessAndChroma(modernLight, `color-neutral-${step}`) ??
  lightnessAndChroma(modernLight, `color-neutral-light-${step}`)

describe('palette mirrors tokens.css', () => {
  it('matches the light neutral scale', () => {
    palette.neutral.light.forEach(([l, c], step) => {
      expect(lightNeutral(step)).toEqual([l, c])
    })
  })

  it('matches the dark neutral scale', () => {
    palette.neutral.dark.forEach(([l, c], step) => {
      expect(lightnessAndChroma(modernDark, `color-neutral-${step}`)).toEqual([
        l,
        c
      ])
    })
  })

  it('matches the dark status steps', () => {
    for (const status of Object.values(palette.status)) {
      if (status.step.dark === null) continue
      const [l, c] = status.value.dark
      expect(
        lightnessAndChroma(
          modernDark,
          `color-${status.intent}-${status.step.dark}`
        )
      ).toEqual([l, c])
    }
  })
})

// Delta, label, and value text are short labels or large figures, so they meet
// decision 0010's Lc 60 tier rather than body text's Lc 75.
const LABEL_LC = 60

describe('text colours on data cards', () => {
  const cardSurface = { light: 1, dark: 2 } as const
  const textSubtle = { light: 11, dark: 11 } as const
  const textStrong = { light: 13, dark: 13 } as const

  const neutralText = (mode: 'light' | 'dark', step: number): Oklch => {
    const [l, c] = palette.neutral[mode][step]!
    return [l!, c!, DEFAULT_ACCENT_HUE]
  }
  const lcOnCard = (mode: 'light' | 'dark', text: Oklch) =>
    Math.abs(apcaLc(text, neutralText(mode, cardSurface[mode])))

  for (const mode of ['light', 'dark'] as const)
    for (const name of ['good', 'critical'] as const)
      it(`delta ${name} reaches APCA Lc ${LABEL_LC} in ${mode}`, () => {
        expect(
          lcOnCard(mode, palette.status[name].value[mode])
        ).toBeGreaterThanOrEqual(LABEL_LC)
      })

  for (const mode of ['light', 'dark'] as const)
    it(`label and context text reach APCA Lc ${LABEL_LC} in ${mode}`, () => {
      expect(
        lcOnCard(mode, neutralText(mode, textSubtle[mode]))
      ).toBeGreaterThanOrEqual(LABEL_LC)
    })

  for (const mode of ['light', 'dark'] as const)
    it(`value text reaches APCA Lc ${LABEL_LC} in ${mode}`, () => {
      expect(
        lcOnCard(mode, neutralText(mode, textStrong[mode]))
      ).toBeGreaterThanOrEqual(LABEL_LC)
    })
})
