import { type Oklch, apcaLc } from '../dataviz/color-math'
import { hexToOklch } from './srgb-to-oklch'

const WHITE: Oklch = [1, 0, 0]
const BLACK: Oklch = [0, 0, 0]
const HEX = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i

/**
 * Pick white or black text, whichever has the higher APCA contrast (|Lc|)
 * against the given background colour. Ties go to white.
 *
 * The background is a hex (`#rgb`, `#rgba`, `#rrggbb`, or `#rrggbbaa`), and
 * its alpha is ignored. Anything else throws a `TypeError`.
 */
export function getContrastColor(backgroundHex: string): 'white' | 'black' {
  const hex = backgroundHex.trim()
  if (!HEX.test(hex)) {
    throw new TypeError(`Invalid hex colour: ${backgroundHex}`)
  }
  // hexToOklch reads 3, 6, or 8 digits, so `#rgba` loses its alpha digit here.
  const { l, c, h } = hexToOklch(hex.length === 5 ? hex.slice(0, 4) : hex)
  const background: Oklch = [l, c, h]

  return Math.abs(apcaLc(WHITE, background)) >=
    Math.abs(apcaLc(BLACK, background))
    ? 'white'
    : 'black'
}
