export type Rgb = [number, number, number]

let context: CanvasRenderingContext2D | null = null

// Paints each colour over the last, as the page stacks them, and reads back
// the sRGB result, so oklch, color-mix and alpha all resolve the same way.
export function flatten(...layers: string[]): Rgb {
  context ??= Object.assign(document.createElement('canvas'), {
    width: 1,
    height: 1
  }).getContext('2d', { willReadFrequently: true })!
  context.clearRect(0, 0, 1, 1)
  for (const colour of layers) {
    context.fillStyle = '#000'
    context.fillStyle = colour
    context.fillRect(0, 0, 1, 1)
  }
  const [r = 0, g = 0, b = 0] = context.getImageData(0, 0, 1, 1).data
  return [r, g, b]
}

/** Whether a colour paints anything, so a fill that is fully transparent doesn't count as a layer. */
export const isPainted = (colour: string) =>
  flatten('#000', colour).join() !== '0,0,0' ||
  flatten('#fff', colour).join() !== '255,255,255'

/** `colour` painted over `base`. */
export function over(base: Rgb, colour: string): Rgb {
  return flatten(`rgb(${base.join(' ')})`, colour)
}

/** The fill an element shows: its own over every ancestor's. */
export function shownFill(element: Element): Rgb {
  const fills: string[] = []
  for (let node: Element | null = element; node; node = node.parentElement) {
    fills.unshift(getComputedStyle(node).backgroundColor)
  }
  return flatten('#fff', ...fills)
}

/** An element's text colour, over the fill it shows on. */
export function shownText(element: Element): Rgb {
  return over(shownFill(element), getComputedStyle(element).color)
}

const linear = (channel: number) => {
  const c = channel / 255
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

// OKLab's L, which is OKLCH's. APCA can't tell two soft fills apart, so fill
// distinction is measured as a lightness step instead.
export function oklchLightness([r, g, b]: Rgb) {
  const [R, G, B] = [linear(r), linear(g), linear(b)]
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B)
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B)
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B)
  return 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
}

// APCA-W3 0.0.98G, constants as published in Myndex/apca-w3
// (src/apca-w3.js, SA98G). Returns Lc; negative is light text on dark.
export function apcaLc(text: Rgb, background: Rgb) {
  const screenY = ([r, g, b]: Rgb) => {
    const y =
      0.2126729 * (r / 255) ** 2.4 +
      0.7151522 * (g / 255) ** 2.4 +
      0.072175 * (b / 255) ** 2.4
    return y < 0.022 ? y + (0.022 - y) ** 1.414 : y
  }
  const textY = screenY(text)
  const backgroundY = screenY(background)
  if (Math.abs(backgroundY - textY) < 0.0005) return 0
  if (backgroundY > textY) {
    const sapc = (backgroundY ** 0.56 - textY ** 0.57) * 1.14
    return sapc < 0.1 ? 0 : (sapc - 0.027) * 100
  }
  const sapc = (backgroundY ** 0.65 - textY ** 0.62) * 1.14
  return sapc > -0.1 ? 0 : (sapc + 0.027) * 100
}

/** The APCA Lc of an element's text over the fill it shows on, as a positive number. */
export function textContrast(element: Element) {
  const background = shownFill(element)
  return Math.abs(
    apcaLc(over(background, getComputedStyle(element).color), background)
  )
}

/** The APCA Lc between two elements' shown fills, as a positive number: how far a control stands out from the surface behind it. */
export function fillContrast(element: Element, surface: Element) {
  return Math.abs(apcaLc(shownFill(element), shownFill(surface)))
}

/** APCA's minimum Lc for each role (docs/decisions/0010-apca-contrast.md). */
export const minimumLc = {
  'body text': 75,
  label: 60,
  'label on a strong fill': 60,
  'large text': 60,
  'display text': 45,
  'non-text UI': 45
} as const
