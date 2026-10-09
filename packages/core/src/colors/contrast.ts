import Color from 'colorjs.io'

import { type Oklch, apcaLc } from '../dataviz/color-math'

const WHITE: Oklch = [1, 0, 0]
const BLACK: Oklch = [0, 0, 0]

/**
 * Pick white or black text, whichever has the higher APCA contrast (|Lc|)
 * against the given background colour. Ties go to white.
 */
export function getContrastColor(backgroundHex: string): 'white' | 'black' {
  const [l, c, h] = new Color(backgroundHex).to('oklch').coords
  // Achromatic colours have no hue, which colorjs reports as NaN.
  const background: Oklch = [Number(l) || 0, Number(c) || 0, Number(h) || 0]

  return Math.abs(apcaLc(WHITE, background)) >=
    Math.abs(apcaLc(BLACK, background))
    ? 'white'
    : 'black'
}
