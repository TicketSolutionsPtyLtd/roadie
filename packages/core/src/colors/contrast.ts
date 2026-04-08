import Color from 'colorjs.io'

/**
 * Determine whether white or black text provides better WCAG contrast
 * against the given background color.
 */
export function getContrastColor(backgroundHex: string): 'white' | 'black' {
  const bg = new Color(backgroundHex).to('srgb')
  const r = Number(bg.coords[0]) || 0
  const g = Number(bg.coords[1]) || 0
  const b = Number(bg.coords[2]) || 0

  const toLinear = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  const luminance =
    0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)

  const contrastWithWhite = (1 + 0.05) / (luminance + 0.05)
  const contrastWithBlack = (luminance + 0.05) / (0 + 0.05)

  return contrastWithWhite >= contrastWithBlack ? 'white' : 'black'
}
