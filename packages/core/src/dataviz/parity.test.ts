import Color from 'colorjs.io'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { DEFAULT_ACCENT_HUE, palette } from './palette'

const tokens = readFileSync(
  new URL('../css/tokens.css', import.meta.url),
  'utf8'
)
const modern = tokens.slice(tokens.indexOf('@supports (color: oklch(0 0 0))'))
const modernDark = modern.slice(modern.indexOf('  .dark {'))
const modernLight = modern.slice(0, modern.indexOf('  .dark {'))

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

describe('text colours on data cards', () => {
  const cardSurface = { light: 1, dark: 2 } as const
  const textSubtle = { light: 11, dark: 11 } as const
  const textStrong = { light: 13, dark: 13 } as const

  const surfaceFor = (mode: 'light' | 'dark') => {
    const [l, c] = palette.neutral[mode][cardSurface[mode]]!
    return new Color('oklch', [l!, c!, DEFAULT_ACCENT_HUE])
  }

  for (const mode of ['light', 'dark'] as const)
    for (const name of ['good', 'critical'] as const)
      it(`delta ${name} reaches 4.5:1 in ${mode}`, () => {
        const text = new Color('oklch', [...palette.status[name].value[mode]])
        expect(
          surfaceFor(mode).contrast(text, 'WCAG21')
        ).toBeGreaterThanOrEqual(4.5)
      })

  for (const mode of ['light', 'dark'] as const)
    it(`label and context text reach 4.5:1 in ${mode}`, () => {
      const [l, c] = palette.neutral[mode][textSubtle[mode]]!
      const text = new Color('oklch', [l!, c!, DEFAULT_ACCENT_HUE])
      expect(surfaceFor(mode).contrast(text, 'WCAG21')).toBeGreaterThanOrEqual(
        4.5
      )
    })

  for (const mode of ['light', 'dark'] as const)
    it(`value text reaches 4.5:1 in ${mode}`, () => {
      const [l, c] = palette.neutral[mode][textStrong[mode]]!
      const text = new Color('oklch', [l!, c!, DEFAULT_ACCENT_HUE])
      expect(surfaceFor(mode).contrast(text, 'WCAG21')).toBeGreaterThanOrEqual(
        4.5
      )
    })
})
