import { describe, expect, it } from 'vitest'

import { type Rgb, apcaLc, oklchLightness } from './contrast'

const grey = (value: number): Rgb => [value, value, value]

describe('apcaLc', () => {
  // The worked examples in Myndex/apca-w3's README, for 0.0.98G.
  it.each([
    ['#888 on #fff', grey(0x88), grey(0xff), 63.056],
    ['#fff on #888', grey(0xff), grey(0x88), -68.541],
    ['#000 on #aaa', grey(0x00), grey(0xaa), 58.146],
    ['#aaa on #000', grey(0xaa), grey(0x00), -56.241]
  ])('measures %s as published', (_, text, background, lc) => {
    expect(apcaLc(text, background)).toBeCloseTo(lc, 2)
  })

  it('reads text on the same colour as no contrast', () => {
    expect(apcaLc(grey(0x77), grey(0x77))).toBe(0)
  })
})

describe('oklchLightness', () => {
  it.each([
    ['black', grey(0), 0],
    ['white', grey(255), 1]
  ])('puts %s at the end of the scale', (_, colour, lightness) => {
    expect(oklchLightness(colour)).toBeCloseTo(lightness, 3)
  })
})
