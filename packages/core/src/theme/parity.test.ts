import Color from 'colorjs.io'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { generateAccentScale } from '../colors/color-scale-generator'
import { DEFAULT_ACCENT_COLOR } from './index'

const tokens = readFileSync(
  new URL('../css/tokens.css', import.meta.url),
  'utf8'
).replace(/\s+/g, ' ')

const accentDefault = (name: string) =>
  tokens.match(new RegExp(`--accent-${name}: ([\\d.]+);`))![1]!

// The accent scale as it draws at the default accent: light before the
// first `.dark` rule, dark after it.
function accentSteps(mode: 'light' | 'dark') {
  const dark = tokens.indexOf(' .dark {')
  const block = mode === 'light' ? tokens.slice(0, dark) : tokens.slice(dark)
  return Array.from({ length: 14 }, (_, step) =>
    block
      .match(
        new RegExp(`--color-accent-(?:light-)?${step}: (oklch\\([^;]*\\));`)
      )?.[1]
      ?.replace(/\( /g, '(')
      .replace(/ \)/g, ')')
      .replace('var(--accent-hue)', accentDefault('hue'))
      .replace('var(--accent-chroma)', accentDefault('chroma'))
      .replace(/calc\(([\d.]+) \* ([\d.]+)\)/, (_, a: string, b: string) =>
        String(Number(a) * Number(b))
      )
  )
}

const deltaE = (a: string, b: string) =>
  new Color(a).deltaE(new Color(b), '2000')

describe('DEFAULT_ACCENT_COLOR', () => {
  it('is the accent step 9 that tokens.css ships', () => {
    expect(deltaE(DEFAULT_ACCENT_COLOR, accentSteps('light')[9]!)).toBeLessThan(
      0.5
    )
  })

  // The generator draws custom accents; at the default it must draw the
  // shipped scale. It rounds to hex and the tokens to three OKLCH places, so
  // up to one just-noticeable difference apart (dark step 10 is 0.61).
  it.each(['light', 'dark'] as const)(
    'generates the %s accent scale tokens.css ships',
    async (mode) => {
      const shipped = accentSteps(mode)
      const generated = (await generateAccentScale(DEFAULT_ACCENT_COLOR))[mode]
      expect(shipped.filter(Boolean)).toHaveLength(14)
      generated.forEach((hex, step) =>
        expect(
          deltaE(hex, shipped[step]!),
          `step ${step}: ${hex} against ${shipped[step]}`
        ).toBeLessThan(1)
      )
    }
  )
})
