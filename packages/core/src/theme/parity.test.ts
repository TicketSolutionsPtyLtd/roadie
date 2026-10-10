import Color from 'colorjs.io'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { generateAccentScale } from '../colors/color-scale-generator'
import { DEFAULT_ACCENT_COLOR } from './index'

const tokens = readFileSync(
  new URL('../css/tokens.css', import.meta.url),
  'utf8'
)

// The hex fallbacks: light in `:root`, dark in `.dark`, before the oklch()
// overrides under `@supports`.
function accentSteps(from: string, to: string) {
  const block = tokens.slice(tokens.indexOf(from), tokens.indexOf(to))
  return Array.from(
    { length: 14 },
    (_, step) =>
      block.match(
        new RegExp(`--color-accent-(?:light-)?${step}: (#[0-9a-f]{6});`)
      )?.[1]
  )
}

describe('DEFAULT_ACCENT_COLOR', () => {
  it('is the accent step 9 that tokens.css ships', () => {
    expect(tokens).toContain(`--color-accent-light-9: ${DEFAULT_ACCENT_COLOR};`)
  })

  // The generator draws custom accents; at the default it must draw the
  // shipped scale, to within hex rounding.
  it.each([
    ['light', accentSteps('\n:root {', '\n.dark {')],
    ['dark', accentSteps('\n.dark {', '\n@supports')]
  ] as const)(
    'generates the %s accent scale tokens.css ships',
    async (mode, shipped) => {
      const generated = (await generateAccentScale(DEFAULT_ACCENT_COLOR))[mode]
      expect(shipped).toHaveLength(14)
      generated.forEach((hex, step) =>
        expect(
          new Color(hex).deltaE(new Color(shipped[step]!), '2000'),
          `step ${step}: ${hex} against ${shipped[step]}`
        ).toBeLessThan(0.5)
      )
    }
  )
})
