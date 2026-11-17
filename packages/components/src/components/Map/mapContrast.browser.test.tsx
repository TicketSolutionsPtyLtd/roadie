import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import roadieCss from '../../../vitest.browser.css?inline'
import {
  apcaLc,
  flatten,
  minimumLc,
  oklchLightness
} from '../../css/contrastTestUtils'
import { useStylesheet } from '../Pane/testUtils'
import { type MapTone, readPalette } from './palette'

// Every basemap colour comes from a Roadie scale, so its labels are checked
// in every intent, mode and tone a map can take.

const INTENTS = [
  'neutral',
  'brand',
  'brand-secondary',
  'brand-purple',
  'accent',
  'danger',
  'success',
  'warning',
  'info'
]
const MODES = ['light', 'dark'] as const
const TONES: MapTone[] = ['intent', 'natural']

const cases = MODES.flatMap((mode) =>
  TONES.flatMap((tone) =>
    (tone === 'natural' ? ['neutral'] : INTENTS).map((intent) => ({
      mode,
      tone,
      intent
    }))
  )
)

describe('Map basemap contrast', () => {
  let removeRoadie: () => void
  beforeAll(() => {
    removeRoadie = useStylesheet(roadieCss)
  })
  afterAll(() => {
    removeRoadie()
    document.documentElement.classList.remove('dark')
  })

  const paletteFor = (mode: string, tone: MapTone, intent: string) => {
    document.documentElement.classList.toggle('dark', mode === 'dark')
    const frame = document.createElement('div')
    frame.className = `intent-${intent}`
    document.body.append(frame)
    const palette = readPalette(frame, tone)
    frame.remove()
    return palette
  }

  it.each(cases)(
    'reads place names in $tone, $intent, $mode',
    ({ mode, tone, intent }) => {
      const palette = paletteFor(mode, tone, intent)
      const label = flatten(palette.label)
      // Labels sit in a halo of the land's colour, over whatever is below.
      expect(
        Math.abs(apcaLc(label, flatten(palette.labelHalo)))
      ).toBeGreaterThanOrEqual(minimumLc.label)
    }
  )

  it.each(cases)(
    'keeps roads apart from water in $tone, $intent, $mode',
    ({ mode, tone, intent }) => {
      const palette = paletteFor(mode, tone, intent)
      // Bridges and riverside roads must not melt into the river.
      expect(
        Math.abs(
          oklchLightness(flatten(palette.road)) -
            oklchLightness(flatten(palette.water))
        )
      ).toBeGreaterThanOrEqual(0.05)
    }
  )

  it.each(cases)(
    'draws roads lighter than the land in $tone, $intent, $mode',
    ({ mode, tone, intent }) => {
      const palette = paletteFor(mode, tone, intent)
      const lightness = (colour: string) =>
        flatten(colour).reduce((sum, channel) => sum + channel, 0)
      // Roads stand out from the land the way the mode's raised surfaces do:
      // lighter than the land, in both modes.
      expect(lightness(palette.road)).toBeGreaterThan(lightness(palette.land))
    }
  )
})
